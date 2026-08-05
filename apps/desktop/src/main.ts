/**
 * Electron main process — the local-first back end host.
 *
 * SECURITY BOUNDARY: everything native lives here, never in the renderer. The
 * renderer is sandboxed (contextIsolation on, nodeIntegration off) and reaches
 * this process ONLY through the typed `window.mi` / `window.miSecure` bridges.
 * The Gemini key lives in the OS keychain (safeStorage); research state
 * persists to a JSON snapshot in userData. (SQLite/Drizzle remains the
 * documented upgrade path — same ResearchStore seam.)
 */
import {
  app,
  BrowserWindow,
  dialog,
  WebContentsView,
  ipcMain,
  Menu,
  type MenuItemConstructorOptions,
  nativeImage,
  net,
  protocol,
  safeStorage,
  session,
  shell,
} from 'electron';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  IPC_CHANNELS,
  SECURE_CHANNELS,
  type MarketIntelRepository,
} from '@mi/contracts';
import { MockRepository } from '@mi/mocks';
import { GeminiRepository, type RepoSnapshot, type ResearchStore } from '@mi/research';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = app.isPackaged
  ? path.join(process.resourcesPath, 'web-dist')
  : path.join(__dirname, '../../web/dist');

app.name = 'Stratemark';
app.setName('Stratemark');
process.title = 'Stratemark';

function createApplicationMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: 'Stratemark',
            submenu: [
              { role: 'about', label: 'About Stratemark' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Hide Stratemark' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit', label: 'Quit Stratemark' },
            ] as MenuItemConstructorOptions[],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ] as MenuItemConstructorOptions[],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

if (process.defaultApp) {
  if (process.argv.length >= 2 && process.argv[1]) {
    app.setAsDefaultProtocolClient('stratemark', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('stratemark');
}

function handleDeepLink(urlStr: string): void {
  if (!urlStr) return;
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol === 'stratemark:') {
      const token = parsed.searchParams.get('token') || parsed.searchParams.get('code');
      const userJson = parsed.searchParams.get('user');
      const user = userJson ? JSON.parse(decodeURIComponent(userJson)) : null;
      if (mainWin && !mainWin.isDestroyed()) {
        mainWin.webContents.send(IPC_CHANNELS.authCallbackEvent, { token, user });
      }
    }
  } catch (err) {
    console.error('Failed to parse deep link URL:', err);
  }
}

app.on('open-url', (event, urlStr) => {
  event.preventDefault();
  handleDeepLink(urlStr);
});

app.on('second-instance', (_event, commandLine) => {
  const urlStr = commandLine.find((arg) => arg.startsWith('stratemark://'));
  if (urlStr) handleDeepLink(urlStr);
});

// ---------------------------------------------------------------------------
// Persistence + key management (main-process only)
// Brain persistence replacing the 5MB localStorage cap
// ---------------------------------------------------------------------------
function createSqliteStore(storeDir: string): ResearchStore {
  const jsonPath = path.join(storeDir, 'brain.json');
  const legacyFile = path.join(storeDir, 'repo.json');
  mkdirSync(storeDir, { recursive: true });

  return {
    read(): RepoSnapshot | null {
      try {
        if (existsSync(jsonPath)) {
          return JSON.parse(readFileSync(jsonPath, 'utf8')) as RepoSnapshot;
        }
        if (existsSync(legacyFile)) {
          const snapshot = JSON.parse(readFileSync(legacyFile, 'utf8')) as RepoSnapshot;
          if (snapshot) {
            const tmpPath = jsonPath + '.tmp';
            writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf8');
            renameSync(tmpPath, jsonPath);
            return snapshot;
          }
        }
        return null;
      } catch (err) {
        console.error('Failed to read research snapshot:', err);
        return null;
      }
    },
    write(snapshot: RepoSnapshot): void {
      try {
        const tmpPath = jsonPath + '.tmp';
        writeFileSync(tmpPath, JSON.stringify(snapshot, null, 2), 'utf8');
        renameSync(tmpPath, jsonPath);
      } catch (err) {
        console.error('Failed to persist research snapshot:', err);
      }
    },
  };
}

const keyFile = (): string => path.join(app.getPath('userData'), 'gemini.key.enc');

function loadApiKey(): string {
  try {
    if (!existsSync(keyFile())) return '';
    const buf = readFileSync(keyFile());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
  } catch {
    return '';
  }
}

function saveApiKey(key: string): void {
  if (!key) {
    if (existsSync(keyFile())) rmSync(keyFile());
    return;
  }
  const data = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(key)
    : Buffer.from(key, 'utf8');
  writeFileSync(keyFile(), data);
}

// ---------------------------------------------------------------------------
// Repository host — live GeminiRepository when a key exists, demo otherwise.
// Hot-swapped when the key changes; refresh events re-wired on swap.
// ---------------------------------------------------------------------------
let repository: MarketIntelRepository;
let unwireRefresh: (() => void) | null = null;
let mainWin: BrowserWindow | null = null;
let activeLandingView: WebContentsView | null = null;

function detachLandingView(): void {
  if (activeLandingView && mainWin && !mainWin.isDestroyed()) {
    try {
      mainWin.contentView.removeChildView(activeLandingView);
    } catch {
      // ignore if already removed
    }
  }
  activeLandingView = null;
}

function makeRepository(): MarketIntelRepository {
  const apiKey = loadApiKey();
  if (!apiKey) return new MockRepository();
  return new GeminiRepository({
    apiKey,
    store: createSqliteStore(path.join(app.getPath('userData'), 'research')),
    targetCompanies: 10,
    concurrency: 3,
  });
}

function wireRefreshForwarding(): void {
  unwireRefresh?.();
  unwireRefresh = repository.subscribeDeckRefresh((evt) => {
    if (mainWin && !mainWin.isDestroyed()) {
      mainWin.webContents.send(IPC_CHANNELS.deckRefreshEvent, evt);
    }
  });
}

function swapRepository(): void {
  repository = makeRepository();
  wireRefreshForwarding();
}

function registerIpc(): void {
  ipcMain.handle(IPC_CHANNELS.listMarkets, () => repository.listMarkets());
  ipcMain.handle(IPC_CHANNELS.getMarket, (_e, id: string) => repository.getMarket(id));
  ipcMain.handle(IPC_CHANNELS.createMarket, (_e, input) => repository.createMarket(input));
  ipcMain.handle(IPC_CHANNELS.updateMarketCadence, (_e, id: string, cadence) =>
    repository.updateMarketCadence(id, cadence),
  );
  ipcMain.handle(IPC_CHANNELS.getDeckByMarket, (_e, marketId: string) =>
    repository.getDeckByMarket(marketId),
  );
  ipcMain.handle(IPC_CHANNELS.refreshDeck, (e, marketId: string, taskId?: string) =>
    repository.refreshDeck(marketId, {
      taskId,
      onProgress: (progress) => {
        if (!e.sender.isDestroyed()) {
          e.sender.send(IPC_CHANNELS.researchProgressEvent, {
            ...progress,
            taskId: progress.taskId ?? taskId,
          });
        }
      },
    }),
  );
  ipcMain.handle(IPC_CHANNELS.createResearchedDeck, (e, brief, taskId?: string) =>
    repository.createResearchedDeck(brief, {
      taskId,
      onProgress: (progress) => {
        if (!e.sender.isDestroyed()) {
          e.sender.send(IPC_CHANNELS.researchProgressEvent, {
            ...progress,
            taskId: progress.taskId ?? taskId,
          });
        }
      },
    }),
  );
  ipcMain.handle(IPC_CHANNELS.listCards, (_e, deckId: string, filter) =>
    repository.listCards(deckId, filter),
  );
  ipcMain.handle(IPC_CHANNELS.getCard, (_e, cardId: string) => repository.getCard(cardId));
  ipcMain.handle(IPC_CHANNELS.getCompany, (_e, companyId: string) =>
    repository.getCompany(companyId),
  );
  ipcMain.handle(IPC_CHANNELS.getCompanyMetrics, (_e, companyId: string) =>
    repository.getCompanyMetrics(companyId),
  );
  ipcMain.handle(IPC_CHANNELS.getViceClaims, (_e, cardId: string) =>
    repository.getViceClaims(cardId),
  );
  ipcMain.handle(IPC_CHANNELS.getDashboardTab, (_e, companyId: string, tab, force?: boolean) =>
    repository.getDashboardTab(companyId, tab, force),
  );
  ipcMain.handle(IPC_CHANNELS.deepDive, (_e, input) => repository.deepDive(input));
  ipcMain.handle(IPC_CHANNELS.factCheck, (_e, input) => repository.factCheck(input));
  ipcMain.handle(IPC_CHANNELS.generateReport, (e, request, taskId?: string) =>
    repository.generateReport(request, {
      taskId,
      onProgress: (progress) => {
        if (!e.sender.isDestroyed()) {
          e.sender.send(IPC_CHANNELS.researchProgressEvent, {
            ...progress,
            taskId: progress.taskId ?? taskId,
          });
        }
      },
    }),
  );
  ipcMain.handle(IPC_CHANNELS.listReports, () => repository.listReports());
  ipcMain.handle(IPC_CHANNELS.getReport, (_e, id: string) => repository.getReport(id));
  ipcMain.handle(IPC_CHANNELS.expandDeck, (e, marketId: string, focus, taskId?: string) =>
    repository.expandDeck(marketId, focus, {
      taskId,
      onProgress: (progress) => {
        if (!e.sender.isDestroyed()) {
          e.sender.send(IPC_CHANNELS.researchProgressEvent, {
            ...progress,
            taskId: progress.taskId ?? taskId,
          });
        }
      },
    }),
  );
  ipcMain.handle(IPC_CHANNELS.overrideMetric, (_e, input) => repository.overrideMetric(input));
  ipcMain.handle(IPC_CHANNELS.getMarketOpportunity, (_e, marketId: string, force?: boolean) =>
    repository.getMarketOpportunity(marketId, force),
  );
  ipcMain.handle(IPC_CHANNELS.askResearch, (e, input, taskId?: string) =>
    repository.askResearch?.(input, {
      taskId,
      onProgress: (progress) => {
        if (!e.sender.isDestroyed()) {
          e.sender.send(IPC_CHANNELS.researchProgressEvent, {
            ...progress,
            taskId: progress.taskId ?? taskId,
          });
        }
      },
    }),
  );
  ipcMain.handle(IPC_CHANNELS.listResearchThreads, (_e, filter) =>
    repository.listResearchThreads?.(filter),
  );
  ipcMain.handle(IPC_CHANNELS.getResearchThread, (_e, id: string) =>
    repository.getResearchThread?.(id),
  );
  ipcMain.handle(IPC_CHANNELS.saveThreadAsReport, (_e, threadId: string, focus?: string | null) =>
    repository.saveThreadAsReport?.(threadId, focus),
  );

  ipcMain.handle(
    IPC_CHANNELS.attachLandingView,
    (_e, url: string, bounds: { x: number; y: number; width: number; height: number }) => {
      detachLandingView();
      if (!mainWin || mainWin.isDestroyed()) return;
      activeLandingView = new WebContentsView();
      mainWin.contentView.addChildView(activeLandingView);
      activeLandingView.setBounds(bounds);
      void activeLandingView.webContents.loadURL(url);
    },
  );

  ipcMain.handle(IPC_CHANNELS.detachLandingView, () => {
    detachLandingView();
  });

  ipcMain.handle(IPC_CHANNELS.exportBrain, async (): Promise<boolean> => {
    if (!mainWin || mainWin.isDestroyed()) return false;
    const { filePath } = await dialog.showSaveDialog(mainWin, {
      title: 'Export Brain Snapshot',
      defaultPath: 'stratemark-brain.json',
      filters: [{ name: 'Stratemark Brain Snapshot', extensions: ['json', 'stratemark'] }],
    });
    if (!filePath) return false;

    const storeDir = path.join(app.getPath('userData'), 'research');
    const store = createSqliteStore(storeDir);
    const snapshot = store.read();
    if (!snapshot) return false;

    writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.importBrain, async (): Promise<boolean> => {
    if (!mainWin || mainWin.isDestroyed()) return false;
    const { filePaths } = await dialog.showOpenDialog(mainWin, {
      title: 'Import Brain Snapshot',
      filters: [{ name: 'Stratemark Brain Snapshot', extensions: ['json', 'stratemark'] }],
      properties: ['openFile'],
    });
    if (!filePaths || filePaths.length === 0) return false;

    try {
      const selectedFile = filePaths[0];
      if (!selectedFile) return false;
      const content = readFileSync(selectedFile, 'utf8');
      const snapshot = JSON.parse(content) as RepoSnapshot;
      if (!snapshot || !Array.isArray(snapshot.markets)) return false;

      const storeDir = path.join(app.getPath('userData'), 'research');
      const store = createSqliteStore(storeDir);
      store.write(snapshot);
      swapRepository();
      return true;
    } catch (err) {
      console.error('Failed to import brain snapshot:', err);
      return false;
    }
  });

  // Secure key storage — persists to the OS keychain and hot-swaps the backend.
  ipcMain.handle(SECURE_CHANNELS.getApiKey, (): string => loadApiKey());
  ipcMain.handle(SECURE_CHANNELS.setApiKey, (_e, key: string): void => {
    saveApiKey(key);
    swapRepository();
  });

  // Google Auth IPC handlers for Electron desktop shell
  interface OAuthUser {
    id: string;
    name: string;
    email: string | null;
    photoURL?: string | null;
  }

  let desktopUser: OAuthUser | null = null;
  let activeOAuthServer: http.Server | null = null;

  async function performGoogleOAuthFlow(): Promise<OAuthUser> {
    if (activeOAuthServer) {
      try {
        activeOAuthServer.close();
      } catch {
        // ignore
      }
      activeOAuthServer = null;
    }

    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      process.env.VITE_FIREBASE_CLIENT_ID;

    const clientSecret =
      process.env.GOOGLE_CLIENT_SECRET ||
      process.env.VITE_GOOGLE_CLIENT_SECRET;

    const authDomain =
      process.env.VITE_FIREBASE_AUTH_DOMAIN ||
      process.env.FIREBASE_AUTH_DOMAIN;

    if (!clientId && !authDomain) {
      throw new Error(
        'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or VITE_FIREBASE_AUTH_DOMAIN environment variables.',
      );
    }

    return new Promise<OAuthUser>((resolve, reject) => {
      let server: http.Server;
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timeoutId);
        if (activeOAuthServer === server) {
          activeOAuthServer = null;
        }
        try {
          server.close();
        } catch {
          // ignore
        }
      };

      server = http.createServer(async (req, res) => {
        try {
          if (!req.url) return;
          const reqUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
          if (reqUrl.pathname !== '/callback' && reqUrl.pathname !== '/') return;

          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');
          const token = reqUrl.searchParams.get('token') || reqUrl.searchParams.get('access_token');
          const userParam = reqUrl.searchParams.get('user');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                  <div style="text-align: center; padding: 2rem; background: #1e293b; border-radius: 0.75rem; border: 1px solid #334155;">
                    <h2 style="color: #ef4444; margin-top: 0;">Authentication Failed</h2>
                    <p style="color: #94a3b8;">${error}</p>
                    <p style="font-size: 0.875rem; color: #64748b;">You may close this tab and return to Stratemark.</p>
                  </div>
                </body>
              </html>
            `);
            cleanup();
            reject(new Error(`Google authentication failed: ${error}`));
            return;
          }

          let user: OAuthUser | null = null;

          if (userParam) {
            try {
              user = JSON.parse(decodeURIComponent(userParam));
            } catch {
              // ignore
            }
          }

          if (!user && code && clientId) {
            const redirectUri = `http://127.0.0.1:${(server.address() as { port: number }).port}/callback`;

            if (clientSecret) {
              const tokenRes = await net.fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                  code,
                  client_id: clientId,
                  client_secret: clientSecret,
                  redirect_uri: redirectUri,
                  grant_type: 'authorization_code',
                }).toString(),
              });

              if (tokenRes.ok) {
                const tokenData = (await tokenRes.json()) as { access_token?: string; id_token?: string };
                if (tokenData.access_token) {
                  const userRes = await net.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${tokenData.access_token}` },
                  });
                  if (userRes.ok) {
                    const userInfo = (await userRes.json()) as {
                      sub: string;
                      name?: string;
                      email?: string;
                      picture?: string;
                    };
                    user = {
                      id: userInfo.sub,
                      name: userInfo.name || userInfo.email || 'Google User',
                      email: userInfo.email || null,
                      photoURL: userInfo.picture || null,
                    };
                  }
                }
              }
            } else {
              const userRes = await net.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${code}` },
              });
              if (userRes.ok) {
                const userInfo = (await userRes.json()) as {
                  sub: string;
                  name?: string;
                  email?: string;
                  picture?: string;
                };
                user = {
                  id: userInfo.sub,
                  name: userInfo.name || userInfo.email || 'Google User',
                  email: userInfo.email || null,
                  photoURL: userInfo.picture || null,
                };
              }
            }
          } else if (!user && token) {
            const userRes = await net.fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (userRes.ok) {
              const userInfo = (await userRes.json()) as {
                sub: string;
                name?: string;
                email?: string;
                picture?: string;
              };
              user = {
                id: userInfo.sub,
                name: userInfo.name || userInfo.email || 'Google User',
                email: userInfo.email || null,
                photoURL: userInfo.picture || null,
              };
            }
          }

          if (user) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                  <div style="text-align: center; padding: 2rem; background: #1e293b; border-radius: 0.75rem; border: 1px solid #334155;">
                    <h2 style="color: #22c55e; margin-top: 0;">✓ Authentication Successful</h2>
                    <p style="color: #94a3b8;">You are logged in to Stratemark as <strong>${user.name}</strong> (${user.email || 'No email'}).</p>
                    <p style="font-size: 0.875rem; color: #64748b;">You can close this window and return to the application.</p>
                  </div>
                </body>
              </html>
            `);
            cleanup();
            resolve(user);
          } else {
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html>
                <body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                  <div style="text-align: center; padding: 2rem; background: #1e293b; border-radius: 0.75rem; border: 1px solid #334155;">
                    <h2 style="color: #ef4444; margin-top: 0;">Authentication Incomplete</h2>
                    <p style="color: #94a3b8;">Unable to obtain user details from Google OAuth response.</p>
                  </div>
                </body>
              </html>
            `);
            cleanup();
            reject(new Error('Unable to obtain user details from Google OAuth response.'));
          }
        } catch (err) {
          cleanup();
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      });

      activeOAuthServer = server;

      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (!address || typeof address === 'string') {
          cleanup();
          reject(new Error('Failed to bind OAuth loopback server.'));
          return;
        }

        const port = address.port;
        const redirectUri = `http://127.0.0.1:${port}/callback`;

        let authUrl: string;
        if (clientId) {
          const state = randomBytes(16).toString('hex');
          const params = new URLSearchParams({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'openid profile email',
            prompt: 'select_account',
            state,
          });
          authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        } else {
          authUrl = `https://${authDomain}/__/auth/handler?redirect_uri=${encodeURIComponent(redirectUri)}`;
        }

        void shell.openExternal(authUrl);
      });

      server.on('error', (err) => {
        cleanup();
        reject(err);
      });

      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Google authentication request timed out (120s).'));
      }, 120_000);
    });
  }

  const handleGoogleSignIn = async () => {
    try {
      const user = await performGoogleOAuthFlow();
      desktopUser = user;
      return desktopUser;
    } catch (err) {
      console.error('[main] Google sign-in failed:', err);
      throw err;
    }
  };

  const handleGoogleSignOut = async () => {
    desktopUser = null;
  };

  ipcMain.handle(IPC_CHANNELS.googleSignIn, handleGoogleSignIn);
  ipcMain.handle(IPC_CHANNELS.googleSignOut, handleGoogleSignOut);
  ipcMain.handle(SECURE_CHANNELS.googleSignIn, handleGoogleSignIn);
  ipcMain.handle(SECURE_CHANNELS.googleSignOut, handleGoogleSignOut);
}

function createWindow(): void {
  const iconPath = path.join(__dirname, '../build/icon.png');
  const appIcon = existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWin = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    title: 'Stratemark — Market Intel Deck Builder',
    icon: appIcon,
    backgroundColor: '#EDECE8',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // required for an ESM preload; the bridge is still isolated
    },
  });

  mainWin.once('ready-to-show', () => {
    mainWin?.show();
    mainWin?.focus();
    if (process.platform === 'darwin') {
      if (appIcon) {
        try {
          app.dock?.setIcon(appIcon);
        } catch {
          // ignore if setIcon fails in dev
        }
      }
      app.dock?.show();
      app.focus({ steal: true });
    }
  });

  wireRefreshForwarding();

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) void mainWin.loadURL(devUrl);
  else void mainWin.loadURL('app://bundle/index.html');
}

process.on('uncaughtException', (err) => {
  console.error('[main] UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[main] UNHANDLED REJECTION:', reason);
});

void app.whenReady().then(() => {
  // Strip frame-blocking headers for in-app browser embedding
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['content-security-policy'];
    delete responseHeaders['Content-Security-Policy'];
    callback({ cancel: false, responseHeaders });
  });

  // Serve the web build under app:// (raw file:// blocks ES modules).
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const rel = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.join(WEB_DIST, decodeURIComponent(rel));
    return net.fetch(pathToFileURL(filePath).toString());
  });

  try {
    repository = makeRepository();
  } catch (err) {
    console.error('[main] Failed to create repository:', err);
    repository = new MockRepository();
  }
  createApplicationMenu();
  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((err) => {
  console.error('[main] Error in app.whenReady():', err);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
