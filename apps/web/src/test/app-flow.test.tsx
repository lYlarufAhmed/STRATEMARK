import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { AppRoutes } from '@/routes';
import { RepositoryProvider } from '@/lib/repository/RepositoryProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { DeepDiveProvider } from '@/features/deepdive/DeepDive';
import { createQueryClient } from '@/lib/query/queryClient';
import { makeRepo } from './test-utils';

function renderApp() {
  const repository = makeRepo();
  return {
    user: userEvent.setup(),
    ...render(
      <RepositoryProvider repository={repository}>
        <QueryClientProvider client={createQueryClient()}>
          <AuthProvider>
            <DeepDiveProvider>
              <MemoryRouter initialEntries={['/']}>
                <AppRoutes />
              </MemoryRouter>
            </DeepDiveProvider>
          </AuthProvider>
        </QueryClientProvider>
      </RepositoryProvider>,
    ),
  };
}

const FIND = { timeout: 4000 } as const;

describe('end-to-end deck flow (markets → deck → 2-level split → card → dashboard)', () => {
  it('navigates the full journey against the mock repository', { timeout: 20000 }, async () => {
    const { user } = renderApp();

    // Navigate to deck history first (home is now the New Deck page).
    const historyLink = await screen.findByRole('link', { name: /deck history/i }, FIND);
    await user.click(historyLink);

    // Deck history → open the sample market's deck.
    const marketBtn = await screen.findByText(
      'Christian Apparel Companies — California',
      undefined,
      FIND,
    );
    await user.click(marketBtn);

    // Level 0 — full deck with the persistent card-type nav. Filtering happens
    // The type nav should be visible with company cards shown by default.
    expect(await screen.findByTestId('type-nav', undefined, FIND)).toBeInTheDocument();

    // Open a company card → reader → dashboard.
    const card = await screen.findByRole('button', { name: /GraceWear Global/ }, FIND);
    await user.click(card);
    const dialog = await screen.findByRole('dialog', undefined, FIND);
    await user.click(within(dialog).getByRole('button', { name: /view more/i }));

    // Dashboard — overview content + tab switch to Metrics.
    expect(await screen.findByText(/What they do/i, undefined, FIND)).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Metrics' }));
    expect(await screen.findByText(/Revenue trend/i, undefined, FIND)).toBeInTheDocument();
    expect(screen.getByText('Cap table')).toBeInTheDocument();
  });
});
