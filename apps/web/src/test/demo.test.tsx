import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { DemoProvider, STORAGE_KEY_DEMO_QUERIES, useDemo } from '@/lib/demo/DemoContext';
import { GoogleAuthProvider } from '@/lib/auth/AuthContext';
import { RepositoryProvider } from '@/lib/repository/RepositoryProvider';
import { TaskManagerProvider } from '@/lib/tasks/TaskManagerContext';
import { UpgradeModal } from '@/components/UpgradeModal';
import { createQueryClient } from '@/lib/query/queryClient';
import { makeRepo } from './test-utils';
import NewDeckPage from '@/features/deck/NewDeckPage';

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

describe('NewDeckPage Deck Creation in Demo Mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function renderNewDeckApp() {
    const repository = makeRepo();
    const queryClient = createQueryClient();
    return {
      user: userEvent.setup(),
      repository,
      ...render(
        <RepositoryProvider repository={repository}>
          <QueryClientProvider client={queryClient}>
            <GoogleAuthProvider>
              <DemoProvider>
                <TaskManagerProvider>
                  <MemoryRouter initialEntries={['/markets/new']}>
                    <Routes>
                      <Route path="/markets/new" element={<NewDeckPage />} />
                      <Route path="/research/:taskId" element={<div>Live Research Task View</div>} />
                    </Routes>
                    <UpgradeModal />
                  </MemoryRouter>
                </TaskManagerProvider>
              </DemoProvider>
            </GoogleAuthProvider>
          </QueryClientProvider>
        </RepositoryProvider>,
      ),
    };
  }

  async function submitDeckPrompt(user: ReturnType<typeof userEvent.setup>, promptText: string) {
    const textarea = screen.getByPlaceholderText(/Direct-to-consumer Christian apparel brands/i);
    await user.type(textarea, promptText);
    const submitBtn = screen.getByRole('button', { name: /Build sample deck|Research & build deck/i });
    await user.click(submitBtn);
  }

  it('allows deck creation and navigates to research when queries remain', async () => {
    const { user } = renderNewDeckApp();

    await submitDeckPrompt(user, 'AI code-review startups');

    expect(await screen.findByText('Live Research Task View')).toBeInTheDocument();
  });

  it('allows deck creation on last query and opens UpgradeModal warning', async () => {
    // Consume 2 queries beforehand
    localStorage.setItem(STORAGE_KEY_DEMO_QUERIES, '1');

    const { user } = renderNewDeckApp();

    await submitDeckPrompt(user, 'Precision fermentation companies');

    // Navigates to live research
    expect(await screen.findByText('Live Research Task View')).toBeInTheDocument();

    // And upgrade modal pops up warning that was the last demo query
    expect(screen.getByText('Unlock Stratemark Pro')).toBeInTheDocument();
    expect(
      screen.getByText(/That was your last demo query! Upgrade to Pro for unlimited AI market research./i),
    ).toBeInTheDocument();
  });

  it('blocks deck creation and triggers UpgradeModal when queries are exhausted', async () => {
    // Queries exhausted
    localStorage.setItem(STORAGE_KEY_DEMO_QUERIES, '0');

    const { user } = renderNewDeckApp();

    await submitDeckPrompt(user, 'Non-alcoholic spirits brands');

    // Does NOT navigate to live research view
    expect(screen.queryByText('Live Research Task View')).not.toBeInTheDocument();
    expect(screen.getByText('What market should we map?')).toBeInTheDocument();

    // UpgradeModal pops up blocking research
    expect(screen.getByText('Unlock Stratemark Pro')).toBeInTheDocument();
    expect(
      screen.getByText(/You have used all 3 dynamic demo queries. Upgrade to Pro for unlimited AI research./i),
    ).toBeInTheDocument();
  });
});
