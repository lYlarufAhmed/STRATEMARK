import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { RepositoryProvider } from '@/lib/repository/RepositoryProvider';
import { GoogleAuthProvider } from '@/lib/auth/AuthContext';
import { createQueryClient } from '@/lib/query/queryClient';
import { ErrorBoundary } from '@/components/states/ErrorBoundary';
import './index.css';

const queryClient = createQueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="The app failed to start">
      <RepositoryProvider>
        <QueryClientProvider client={queryClient}>
          <GoogleAuthProvider>
            <App />
          </GoogleAuthProvider>
        </QueryClientProvider>
      </RepositoryProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
