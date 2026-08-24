import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useSession } from './useSession';

/**
 * Keeps a screen behind a session.
 *
 * The API refuses every board route without one, so the alternative is four columns each
 * painting their own red 401 — which is a true description of what happened and a useless one to
 * be given. Being asked to sign in is the honest reading.
 *
 * It renders nothing at all while the answer is in flight rather than guessing. The query takes
 * a request, and guessing "signed out" for that moment would flash the sign-in screen at a
 * signed-in person on every single reload.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const { me, settled } = useSession();

  if (!settled) {
    return null;
  }

  return me === null ? <Navigate to="/signin" replace /> : <>{children}</>;
}
