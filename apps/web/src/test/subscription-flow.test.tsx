import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { DemoProvider } from '@/lib/demo/DemoContext';
import { GoogleAuthProvider } from '@/lib/auth/AuthContext';
import { TaskManagerProvider } from '@/lib/tasks/TaskManagerContext';
import { TopBar } from '@/components/layout/TopBar';
import { UpgradeModal } from '@/components/UpgradeModal';
import SettingsPage from '@/features/settings/SettingsPage';
import { RepositoryProvider } from '@/lib/repository/RepositoryProvider';
import { createQueryClient } from '@/lib/query/queryClient';
import { MockRepository } from '@mi/mocks';

function TestAppShell() {
  return (
    <QueryClientProvider client={createQueryClient()}>
      <GoogleAuthProvider>
        <DemoProvider>
          <TaskManagerProvider>
            <RepositoryProvider repository={new MockRepository()}>
              <TopBar />
              <UpgradeModal />
              <SettingsPage />
            </RepositoryProvider>
          </TaskManagerProvider>
        </DemoProvider>
      </GoogleAuthProvider>
    </QueryClientProvider>
  );
}

describe('Paid Subscription & Google Auth Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('stratemark_auth_user', '');
  });

  it('renders primary Upgrade to Pro ($49) CTA and "Already purchased? Sign in" link in Demo Mode', () => {
    render(<TestAppShell />);

    const upgradeCtas = screen.getAllByRole('button', { name: /upgrade to pro/i });
    expect(upgradeCtas.length).toBeGreaterThan(0);

    const signinLinks = screen.getAllByRole('button', { name: /already purchased\? sign in/i });
    expect(signinLinks.length).toBeGreaterThan(0);
  });

  it('opens UpgradeModal when TopBar Upgrade CTA is clicked', async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    const topBarUpgradeCta = screen.getAllByRole('button', { name: /upgrade to pro/i })[0];
    expect(topBarUpgradeCta).toBeDefined();
    await user.click(topBarUpgradeCta!);

    expect(screen.getByText('Unlock Stratemark Pro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upgrade with paddle/i })).toBeInTheDocument();
  });

  it('provides "Already purchased? Sign in" option inside UpgradeModal', async () => {
    const user = userEvent.setup();
    render(<TestAppShell />);

    const topBarUpgradeCta = screen.getAllByRole('button', { name: /upgrade to pro/i })[0];
    expect(topBarUpgradeCta).toBeDefined();
    await user.click(topBarUpgradeCta!);

    const modalSigninLink = screen.getAllByRole('button', { name: /already purchased\? sign in/i })[0];
    expect(modalSigninLink).toBeInTheDocument();
  });
});
