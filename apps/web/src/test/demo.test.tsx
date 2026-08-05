import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DemoProvider, useDemo } from '@/lib/demo/DemoContext';
import { GoogleAuthProvider } from '@/lib/auth/AuthContext';
import { UpgradeModal } from '@/components/UpgradeModal';

function DemoTestComponent() {
  const {
    remainingDemoQueries,
    isDemoMode,
    consumeDemoQuery,
    checkFeatureAccess,
    openUpgradeModal,
  } = useDemo();

  return (
    <div>
      <span data-testid="remaining-queries">{remainingDemoQueries}</span>
      <span data-testid="demo-mode">{isDemoMode ? 'yes' : 'no'}</span>
      <button onClick={() => consumeDemoQuery()}>Ask Question</button>
      <button onClick={() => checkFeatureAccess('Web Scraping')}>Scrape Web</button>
      <button onClick={() => openUpgradeModal('Direct upgrade request')}>Manual Upgrade</button>
    </div>
  );
}

describe('Demo Mode System & Query Counter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with 3 dynamic demo queries in unauthenticated demo mode', () => {
    render(
      <GoogleAuthProvider>
        <DemoProvider>
          <DemoTestComponent />
        </DemoProvider>
      </GoogleAuthProvider>,
    );

    expect(screen.getByTestId('remaining-queries')).toHaveTextContent('3');
    expect(screen.getByTestId('demo-mode')).toHaveTextContent('yes');
  });

  it('decrements query counter dynamically from 3 down to 0 on each question asked', async () => {
    const user = userEvent.setup();
    render(
      <GoogleAuthProvider>
        <DemoProvider>
          <DemoTestComponent />
        </DemoProvider>
      </GoogleAuthProvider>,
    );

    const askBtn = screen.getByRole('button', { name: 'Ask Question' });

    // 1st question -> 2 remaining
    await user.click(askBtn);
    expect(screen.getByTestId('remaining-queries')).toHaveTextContent('2');

    // 2nd question -> 1 remaining
    await user.click(askBtn);
    expect(screen.getByTestId('remaining-queries')).toHaveTextContent('1');

    // 3rd question -> 0 remaining
    await user.click(askBtn);
    expect(screen.getByTestId('remaining-queries')).toHaveTextContent('0');
  });

  it('triggers upgrade modal when demo query limit is reached (0 remaining)', async () => {
    const user = userEvent.setup();
    render(
      <GoogleAuthProvider>
        <DemoProvider>
          <DemoTestComponent />
          <UpgradeModal />
        </DemoProvider>
      </GoogleAuthProvider>,
    );

    const askBtn = screen.getByRole('button', { name: 'Ask Question' });

    // Use all 3 queries
    await user.click(askBtn);
    await user.click(askBtn);
    await user.click(askBtn);

    // Modal pops up on last query or when attempting further query
    expect(screen.getByText('Unlock Stratemark Pro')).toBeInTheDocument();
    expect(screen.getByText(/Upgrade with Paddle/i)).toBeInTheDocument();
  });

  it('triggers upgrade modal when attempting gated feature (e.g. Web Scraping)', async () => {
    const user = userEvent.setup();
    render(
      <GoogleAuthProvider>
        <DemoProvider>
          <DemoTestComponent />
          <UpgradeModal />
        </DemoProvider>
      </GoogleAuthProvider>,
    );

    const scrapeBtn = screen.getByRole('button', { name: 'Scrape Web' });
    await user.click(scrapeBtn);

    expect(screen.getByText('Unlock Stratemark Pro')).toBeInTheDocument();
    expect(screen.getByText(/Web Scraping is available in Pro/i)).toBeInTheDocument();
  });
});
