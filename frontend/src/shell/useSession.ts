import { useQuery } from '@tanstack/react-query';
import { getMe, sessionKey } from '../api/auth';

/**
 * Who is signed in.
 *
 * A query rather than a context, and there is a precedent either way here — but the theme layer
 * gets to be local state precisely because "a component never asks what theme it is in", which
 * is exactly what a session is not. TanStack already dedupes, so the gate and the header asking
 * separately is one request, and nothing needs a new provider: every existing component test
 * still renders through the same helper it always did.
 */
export function useSession() {
  const query = useQuery({ queryKey: sessionKey, queryFn: getMe });

  return {
    /** The signed-in user, or null once it is known that there is nobody. */
    me: query.data ?? null,

    /**
     * Whether the answer has arrived. Guessing "signed out" while it is in flight would throw a
     * signed-in person onto the sign-in screen on every reload.
     */
    settled: !query.isPending,
  };
}
