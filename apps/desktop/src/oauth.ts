import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { net, shell } from 'electron';

export interface OAuthUser {
  id: string;
  name: string;
  email: string | null;
  photoURL?: string | null;
}

let activeOAuthServer: http.Server | null = null;

export function loadDesktopEnv(): void {
  const envPaths = [
    path.join(process.cwd(), 'apps/desktop/.env'),
    path.join(process.cwd(), '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {
        // ignore read errors
      }
    }
  }
}

function ensureEnvLoaded(): void {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return;
  loadDesktopEnv();
}

export function getActiveOAuthServer(): http.Server | null {
  return activeOAuthServer;
}

export async function performGoogleOAuthFlow(): Promise<OAuthUser> {
  ensureEnvLoaded();

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
                  <p style="color: #94a3b8;">Could not resolve Google profile information.</p>
                </div>
              </body>
            </html>
          `);
          cleanup();
          reject(new Error('Google authentication completed but profile details could not be retrieved.'));
        }
      } catch (err) {
        cleanup();
        reject(err instanceof Error ? err : new Error('OAuth server error'));
      }
    });

    activeOAuthServer = server;

    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      const redirectUri = `http://127.0.0.1:${port}/callback`;

      let authUrl: string;

      if (clientId) {
        authUrl =
          `https://accounts.google.com/o/oauth2/v2/auth?` +
          `client_id=${encodeURIComponent(clientId)}&` +
          `redirect_uri=${encodeURIComponent(redirectUri)}&` +
          `response_type=code&` +
          `scope=${encodeURIComponent('openid profile email')}&` +
          `prompt=select_account`;
      } else {
        const domain = authDomain || 'stratemark.firebaseapp.com';
        authUrl = `https://${domain}/__/__/auth/handler?redirect_uri=${encodeURIComponent(redirectUri)}`;
      }

      shell.openExternal(authUrl).catch((err) => {
        cleanup();
        reject(new Error(`Failed to launch browser for Google Auth: ${err.message}`));
      });
    });

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Google OAuth flow timed out after 5 minutes.'));
    }, 5 * 60 * 1000);
  });
}
