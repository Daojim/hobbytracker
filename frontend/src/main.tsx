import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import './index.css';

/**
 * Server state lives in TanStack Query rather than in component state. The board wants a drag to
 * move a card immediately and put it back if the request fails, and hand-rolling that against
 * four columns of paged data is the kind of thing that works until it does not.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The board is a single-user view of data only this browser changes, so refetching on
      // every window focus is noise. Mutations invalidate what they touched instead.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

const root = document.getElementById('root');
if (root === null) {
  throw new Error('No #root element — index.html and main.tsx disagree.');
}

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
