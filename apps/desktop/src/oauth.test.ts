import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';

vi.mock('electron', () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
  net: {
    fetch: vi.fn(),
  },
}));

import { performGoogleOAuthFlow, getActiveOAuthServer } from './oauth.js';
import { shell } from 'electron';

describe('Desktop Google OAuth Loopback Flow', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.VITE_GOOGLE_CLIENT_ID;
    delete process.env.VITE_FIREBASE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.VITE_GOOGLE_CLIENT_SECRET;
    delete process.env.VITE_FIREBASE_AUTH_DOMAIN;
    delete process.env.FIREBASE_AUTH_DOMAIN;
  });

  afterEach(() => {
    process.env = originalEnv;
    const server = getActiveOAuthServer();
    if (server) {
      try {
        server.close();
      } catch {}
    }
  });

  it('throws configuration error when Google OAuth environment variables are missing', async () => {
    await expect(performGoogleOAuthFlow()).rejects.toThrow(
      'Google OAuth is not configured. Missing GOOGLE_CLIENT_ID or VITE_FIREBASE_AUTH_DOMAIN environment variables.',
    );
  });

  it('launches OAuth server on 127.0.0.1, opens consent URL, and resolves user upon callback with encoded user param', async () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com';

    const mockUser = {
      id: 'google_user_123',
      name: 'Desktop Analyst',
      email: 'desktop@stratemark.ai',
    };

    const flowPromise = performGoogleOAuthFlow();

    // Give server a moment to start and call shell.openExternal
    await new Promise((r) => setTimeout(r, 50));

    expect(shell.openExternal).toHaveBeenCalledWith(
      expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth'),
    );

    const activeServer = getActiveOAuthServer();
    expect(activeServer).not.toBeNull();

    if (activeServer) {
      const address = activeServer.address() as { port: number };
      const encodedUser = encodeURIComponent(JSON.stringify(mockUser));

      // Trigger the local callback endpoint
      await new Promise<void>((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${address.port}/callback?user=${encodedUser}`, (res) => {
            expect(res.statusCode).toBe(200);
            resolve();
          })
          .on('error', reject);
      });
    }

    const user = await flowPromise;
    expect(user).toEqual(mockUser);
  });

  it('rejects with error message when callback receives authentication error', async () => {
    process.env.VITE_FIREBASE_AUTH_DOMAIN = 'stratemark.firebaseapp.com';

    const flowPromise = performGoogleOAuthFlow();
    flowPromise.catch(() => {});

    await new Promise((r) => setTimeout(r, 50));

    const activeServer = getActiveOAuthServer();
    expect(activeServer).not.toBeNull();

    if (activeServer) {
      const address = activeServer.address() as { port: number };

      await new Promise<void>((resolve, reject) => {
        http
          .get(`http://127.0.0.1:${address.port}/callback?error=user_cancelled`, (res) => {
            expect(res.statusCode).toBe(400);
            resolve();
          })
          .on('error', reject);
      });
    }

    await expect(flowPromise).rejects.toThrow('Google authentication failed: user_cancelled');
  });
});
