import type { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { DndContext } from '@dnd-kit/core';
import { useBoardSensors } from '../board/sensors';

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
 *
 * The sensors are production's, from `board/sensors.ts`, and that matters more than it looks: a
 * bare DndContext takes dnd-kit's defaults, which have no activation constraint, so every press
 * on a card activates a drag from the first pixel and dnd-kit swallows the click that follows.
 * A card whose title correctly lets the press through then looks unopenable here and works fine
 * in a browser, which is the least useful way for a test to disagree with the app.
 *
 * `path` mounts the tree at a parameterised route, for a component that reads `useParams` —
 * BoardPage takes its hobby out of the address now. A MemoryRouter alone matches nothing, so
 * without it the params are empty and the page redirects instead of rendering, which reads as
 * the board being broken rather than as the harness not having said where it is.
 */
export function renderWithProviders(
  ui: ReactElement,
  {
    dnd = false,
    route = '/board/games',
    path,
  }: { dnd?: boolean; route?: string; path?: string } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    const sensors = useBoardSensors();
    const routed = (
      <MemoryRouter initialEntries={[route]}>
        {path === undefined ? (
          children
        ) : (
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        )}
      </MemoryRouter>
    );

    return (
      <QueryClientProvider client={queryClient}>
        {dnd ? <DndContext sensors={sensors}>{routed}</DndContext> : routed}
      </QueryClientProvider>
    );
  }

  return { queryClient, ...render(ui, { wrapper: Wrapper }) };
}

/**
 * The phone's Back button, in the only form jsdom can offer one: the same POP, through the same
 * router. There is no `window.history` behind a MemoryRouter, so a test that wants a back press
 * has to ask the router for it — which is all the browser's own press amounts to.
 *
 * Here rather than in one spec because two of them need it, at two levels: whether the drawer
 * closes is the board's business, and whether the page it goes back to is the same page is the
 * router's.
 */
export function BackButton() {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => void navigate(-1)}>
      go back
    </button>
  );
}
