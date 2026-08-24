import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionKey, signOut } from '../api/auth';
import { useSession } from './useSession';

/**
 * Who you are, and the way out.
 *
 * Renders nothing at all until the session is known. The header sits inside the gate, so in
 * practice the answer is already cached by the time this mounts — but a name-shaped gap for that
 * moment is better than a flash of somebody else's.
 *
 * The name is `text-muted` and nothing further. Every theme's `--muted` is picked to clear 4.5:1
 * against its own surface, so an `opacity-` on top takes it back under — silently, because the
 * contrast test checks the tokens rather than what a component does to them afterwards.
 */
export function SessionBadge() {
  const { me } = useSession();
  const queryClient = useQueryClient();

  const leave = useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      // Written before the cache is emptied: the gate reads this key, so correcting it is what
      // moves the app to the sign-in screen. Clearing everything else afterwards stops one
      // person's board being the first thing the next one sees.
      queryClient.setQueryData(sessionKey, null);
      queryClient.clear();
    },
  });

  if (me === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-sm text-muted sm:inline">{me.displayName}</span>

      <button
        type="button"
        onClick={() => leave.mutate()}
        disabled={leave.isPending}
        className="rounded border border-line px-2 py-0.5 text-sm text-muted hover:bg-hover
          hover:text-fg"
      >
        {leave.isPending ? 'Signing out…' : 'Sign out'}
      </button>
    </div>
  );
}
