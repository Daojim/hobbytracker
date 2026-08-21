import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router';
import { DndContext } from '@dnd-kit/core';

/**
 * The providers a board component needs to render at all.
 *
 * A fresh QueryClient per call, because a cache shared between tests is a test that passes
 * because of the one before it. `retry: false` matters more than it looks: the default three
 * retries with backoff turn a deliberately-failing request into a test that hangs and then times
 * out, reporting nothing useful about what actually broke.
 *
 * `dnd` wraps the tree in a DndContext. Cards and columns call dnd-kit hooks, which do nothing
 * without one — harmless, but it means the test would be rendering a shape production never
 * sees. BoardPage brings its own context, so it renders without this.
 */
export function renderWithProviders(ui: ReactElement, { dnd = false }: { dnd?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    const routed = <MemoryRouter>{children}</MemoryRouter>;

    return (
      <QueryClientProvider client={queryClient}>
        {dnd ? <DndContext>{routed}</DndContext> : routed}
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}
