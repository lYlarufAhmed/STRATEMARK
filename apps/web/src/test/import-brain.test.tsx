import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ImportBrainModal } from '@/components/ImportBrainModal';
import SettingsPage from '@/features/settings/SettingsPage';
import { RepositoryProvider } from '@/lib/repository/RepositoryProvider';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { DemoProvider } from '@/lib/demo/DemoContext';
import { createQueryClient } from '@/lib/query/queryClient';
import { makeRepo } from './test-utils';

describe('ImportBrainModal & Cloud Brain Import', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders modal and parses valid JSON file on upload', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const repository = makeRepo();

    render(
      <RepositoryProvider repository={repository}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DemoProvider>
              <MemoryRouter>
                <ImportBrainModal open={true} onOpenChange={() => {}} />
              </MemoryRouter>
            </DemoProvider>
          </AuthProvider>
        </QueryClientProvider>
      </RepositoryProvider>,
    );

    expect(screen.getByText('Import Research Brain')).toBeInTheDocument();

    const sampleFile = new File(
      [
        JSON.stringify({
          markets: [
            {
              id: 'mkt_test_1',
              name: 'Test Market',
              scopeDefinition: { vertical: 'Fintech', geography: null, notes: null },
              refreshCadence: 'weekly',
              createdAt: '2026-08-01T00:00:00Z',
            },
          ],
        }),
      ],
      'brain.json',
      { type: 'application/json' },
    );

    const fileInput = screen.getByLabelText(/Click to choose a JSON/i);
    await user.upload(fileInput, sampleFile);

    expect(await screen.findByText('Snapshot Contents')).toBeInTheDocument();
    expect(screen.getByText('1 valid / 1 total')).toBeInTheDocument();
  });

  it('opens ImportBrainModal from SettingsPage button click', async () => {
    const user = userEvent.setup();
    const queryClient = createQueryClient();
    const repository = makeRepo();

    render(
      <RepositoryProvider repository={repository}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DemoProvider>
              <MemoryRouter>
                <SettingsPage />
              </MemoryRouter>
            </DemoProvider>
          </AuthProvider>
        </QueryClientProvider>
      </RepositoryProvider>,
    );

    const importBtn = screen.getByRole('button', { name: /Import Brain Snapshot/i });
    await user.click(importBtn);

    expect(await screen.findByText('Import Research Brain')).toBeInTheDocument();
  });
});
