import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { deleteAccount } from '../api/account';
import { sessionKey } from '../api/auth';

/** What a finished delete hands the sign-in screen, so it can say so. */
const ACCOUNT_DELETED = { accountDeleted: true } as const;

/**
 * Whether the screen was reached from a delete. Router state is whatever a navigation sent, so
 * it is checked rather than trusted.
 */
export function wasDeleted(state: unknown): boolean {
  return (
    typeof state === 'object'
    && state !== null
    && (state as { accountDeleted?: unknown }).accountDeleted === true
  );
}

/**
 * Deleting your account, and what happens once it is gone.
 *
 * A hook for the menu to hold rather than something inside the warning, for the spreadsheet's
 * reason: closing the panel while the delete is on its way unmounts the warning, and opening it
 * again has to find the delete still going rather than the row, as though nothing had been
 * pressed. Where it lands needs none of that. Callbacks given to `useMutation`, as these are,
 * run whatever is still mounted; the ones given to `mutate` would not.
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      // To the sign-in screen, saying so. Replacing the board's entry, so that Back does not
      // return to a board nobody owns any more.
      void navigate('/signin', { replace: true, state: ACCOUNT_DELETED });

      // Everything this browser held of the account goes, as on signing out, so nothing of one
      // person's board is the first thing the next one sees. Then the session is written as
      // nobody, which is now true, so a Back press to a board finds the gate already answered.
      queryClient.clear();
      queryClient.setQueryData(sessionKey, null);
    },
  });
}
