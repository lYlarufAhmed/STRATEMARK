import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoogleAuthProvider, useAuth } from '@/lib/auth/AuthContext';
import { TaskManagerProvider } from '@/lib/tasks/TaskManagerContext';
import { TopBar } from '@/components/layout/TopBar';

function TestAuthComponent() {
  const { user, isAuthenticated, signInWithGoogle, signOut } = useAuth();
  return (
    <div>
      <span data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Unauthenticated'}</span>
      <span data-testid="user-name">{user?.name ?? 'No user'}</span>
      <button onClick={() => signInWithGoogle()}>Login</button>
      <button onClick={() => signOut()}>Logout</button>
    </div>
  );
}

describe('Google Auth System', () => {
  it('renders topbar user profile dropdown and sign-out flow', async () => {
    const user = userEvent.setup();
    render(
      <GoogleAuthProvider>
        <TaskManagerProvider>
          <TopBar />
        </TaskManagerProvider>
      </GoogleAuthProvider>,
    );

    expect(screen.getByText('Local Analyst')).toBeInTheDocument();

    const profileBtn = screen.getByRole('button', { name: /user profile menu/i });
    await user.click(profileBtn);

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();

    await user.click(signOutBtn);

    expect(await screen.findByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
  });

  it('supports sign in with Google', async () => {
    const user = userEvent.setup();
    render(
      <GoogleAuthProvider>
        <TestAuthComponent />
      </GoogleAuthProvider>,
    );

    const logoutBtn = screen.getByRole('button', { name: 'Logout' });
    await user.click(logoutBtn);
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Unauthenticated');

    const loginBtn = screen.getByRole('button', { name: 'Login' });
    await user.click(loginBtn);

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Google Analyst');
  });
});
