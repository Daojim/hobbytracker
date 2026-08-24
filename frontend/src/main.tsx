import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { createQueryClient } from './api/queryClient';
import './index.css';

/**
 * Server state lives in TanStack Query rather than in component state. The board wants a drag to
 * move a card immediately and put it back if the request fails, and hand-rolling that against
 * four columns of paged data is the kind of thing that works until it does not.
 *
 * Its configuration is a function in api/queryClient.ts rather than a literal here, so the part
 * worth testing — what happens when the server stops recognising the browser — is reachable
 * without a browser.
 */
const queryClient = createQueryClient();

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
