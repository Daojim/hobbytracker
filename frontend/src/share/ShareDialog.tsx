import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { changeShare, makeShare, stopShare, type ShareRequest } from '../api/share';
import type { Share, SharePart } from '../api/types';
import { canHide, useHiddenColumns } from '../board/hiddenColumns';
import { shareKey } from '../board/keys';
import { columnsFor, hobbyDefinition } from '../hobbies';
import { useModalPanel } from '../lib/useModalPanel';
import { useSession } from '../shell/useSession';
import { sharedPath } from './paths';
import { shareQuery } from './queries';

/** Every part in the order the boxes are laid out, columns first: the API's order too. */
const PART_ORDER: readonly SharePart[] = [
  'InProgress',
  'OnHold',
  'Completed',
  'Dropped',
  'Upcoming',
  'Stats',
];

const inOrder = (parts: readonly SharePart[]): SharePart[] =>
  PART_ORDER.filter((part) => parts.includes(part));

const asRequest = (share: Share): ShareRequest => ({
  parts: share.parts,
  showsName: share.showsName,
});

/** How long Copy says it copied, before it offers to again. */
const COPIED_FOR_MS = 2000;

type Failure = 'make' | 'change' | 'stop';

/**
 * What a write that failed says, under the boxes: the spreadsheet row's failure line, in the
 * dialog, beside whichever control failed. Picked from renders on 5 October 2026 over saying
 * nothing, as were "Making the link…" and "Stopping…" over buttons that only dim.
 */
const FAILED: Record<Failure, string> = {
  make: 'Couldn’t make the link. Try again.',
  change: 'Couldn’t change what the link shows. Try again.',
  stop: 'Couldn’t stop sharing. Try again.',
};

export interface ShareDialogProps {
  hobby: string;
  /** Closes the dialog. Settings takes the keyboard back, since the row went with the panel. */
  onClose: () => void;
}

/**
 * Sharing a board: the link, and what it shows. Opened from the Sharing row in Settings.
 *
 * **Before a link exists** it shows *No link yet*, the boxes and *Make the link*, and opening it
 * makes nothing. The boxes start from what this browser's board shows, with the calendar and Stats
 * on and the owner's name off. **Once shared** it shows the address and Copy, the boxes as the
 * link has them, *Stop sharing* and *Done*. A box writes as it is ticked, with no Save, and
 * stopping asks first, in the tint every delete in the app wears, in the footer's place.
 *
 * Every value is the #9 workshop's, picked on 4 October 2026: 448px across, the columns beside
 * the rest, and the journal's scrim and keyboard — `useModalPanel` — borrowed whole.
 */
export function ShareDialog({ hobby, onClose }: ShareDialogProps) {
  const definition = hobbyDefinition(hobby);
  const words = definition.share!;
  const queryClient = useQueryClient();
  const { me } = useSession();
  const hidden = useHiddenColumns(hobby);
  const { data: share } = useQuery(shareQuery(hobby));

  const titleId = useId();
  const ids = useId();
  const panel = useRef<HTMLElement>(null);
  const address = useRef<HTMLInputElement>(null);
  useModalPanel(panel, onClose);

  // The boxes: the board's columns but Backlog, which every share shows, and then the rest this
  // board has — its calendar, its Stats page — each in the board's own words.
  const columns = columnsFor(hobby).filter((column) => canHide(column.status));
  const extras = [
    ...(definition.releases === null
      ? []
      : [{ part: 'Upcoming' as const, label: definition.releases.heading }]),
    ...(definition.stats === null ? [] : [{ part: 'Stats' as const, label: 'Stats' }]),
  ];

  // What a link would show if it were made now. From this browser's board when the dialog opens —
  // the columns it draws, with the calendar and Stats on and the name off — and from the link's
  // own boxes once one is stopped, so sharing again starts where the last one left off.
  const [draft, setDraft] = useState<ShareRequest>(() => ({
    parts: inOrder([
      ...columns
        .filter((column) => !hidden.has(column.status))
        .map((column) => column.status as SharePart),
      ...extras.map((extra) => extra.part),
    ]),
    showsName: false,
  }));

  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);

  const settle = (next: Share | null) => queryClient.setQueryData(shareKey(hobby), next);

  const make = useMutation({
    mutationFn: (request: ShareRequest) => makeShare(hobby, request),
    onSuccess: settle,
    onError: (error) => {
      // Another tab made the link first. Show that one, rather than a second nobody could stop.
      if (error instanceof ApiError && error.status === 409) {
        void queryClient.invalidateQueries({ queryKey: shareKey(hobby) });
        return;
      }

      setFailure('make');
    },
  });

  const stop = useMutation({
    mutationFn: () => stopShare(hobby),
    onSuccess: () => {
      setConfirming(false);
      settle(null);
    },
    onError: () => setFailure('stop'),
  });

  // A box writes as it is ticked, and **one write is on its way at a time**, carrying whatever the
  // boxes say when it goes. Two in flight could land in either order, and the older winning would
  // leave the link showing a box the dialog says is off. `wanted` is what the boxes say while a
  // write has yet to land; `queued` is the next one to send.
  const [wanted, setWanted] = useState<ShareRequest | null>(null);
  const queued = useRef<ShareRequest | null>(null);
  const sending = useRef(false);

  async function send() {
    if (sending.current) {
      return;
    }

    sending.current = true;
    let failed = false;

    while (queued.current !== null && !failed) {
      const request = queued.current;
      queued.current = null;

      try {
        settle(await changeShare(hobby, request));
      } catch {
        failed = true;
      }
    }

    sending.current = false;

    // A write that failed takes the boxes back to what the link really shows, and says so.
    if (failed) {
      queued.current = null;
      setFailure('change');
      void queryClient.invalidateQueries({ queryKey: shareKey(hobby) });
    }

    setWanted(null);
  }

  const boxes: ShareRequest =
    share === undefined || share === null ? draft : (wanted ?? asRequest(share));

  function choose(next: ShareRequest) {
    setFailure(null);

    if (share === undefined || share === null) {
      setDraft(next);
      return;
    }

    setWanted(next);
    queued.current = next;
    void send();
  }

  const tick = (part: SharePart, on: boolean) =>
    choose({
      ...boxes,
      parts: inOrder(on ? [...boxes.parts, part] : boxes.parts.filter((each) => each !== part)),
    });

  const url = share ? `${window.location.origin}${sharedPath(share.token)}` : null;

  async function copy(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      // No clipboard to write to — an insecure page, or a refusal. The address is selected
      // instead, so the keyboard's own copy takes it.
      address.current?.select();
    }
  }

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  return (
    <>
      {/* The journal's scrim: a press on it closes the dialog. Presentation rather than hidden,
          because aria-modal on the dialog is what tells a screen reader the board behind is inert,
          and this exists for the pointer. A sibling of the dialog rather than its parent, so a
          press that starts in the address and is let go over the scrim selects text rather than
          closing anything: a click lands on the two ends' common ancestor, which is not this. */}
      <div role="presentation" onClick={onClose} className="fixed inset-0 z-40 bg-scrim" />

      {/* Where the dialog sits: high on the screen, 12vh down, and scrolled as a whole on a screen
          too short for it. Transparent to the pointer, so the scrim under it takes the presses. */}
      <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 pt-[12vh]">
        <section
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="pointer-events-auto w-full max-w-md rounded-xl border border-line bg-surface p-5 text-fg shadow-xl outline-none"
        >
          <h2 id={titleId} className="text-lg font-semibold">
            Share this board
          </h2>
          <p className="mt-1 text-sm text-muted">{words.explains}</p>

          {share !== undefined && (
            <>
              <div className="mt-4">
                {url === null ? (
                  <p className="rounded border border-dashed border-line px-3 py-2.5 text-sm text-muted">
                    No link yet. Choose what it shows, then make it.
                  </p>
                ) : (
                  <div className="flex items-center gap-1">
                    {/* The whole address, as Copy copies it, at a width it can be read at. */}
                    <input
                      ref={address}
                      readOnly
                      value={url}
                      aria-label="Link to this board"
                      onFocus={(event) => event.currentTarget.select()}
                      className="min-w-0 flex-1 rounded border border-line bg-sunken px-2 py-1.5 text-sm text-fg"
                    />
                    <button
                      type="button"
                      onClick={() => void copy(url)}
                      className="shrink-0 rounded border border-line px-3 py-1.5 text-sm font-medium hover:bg-hover"
                    >
                      {copied ? (
                        <>
                          <span aria-hidden="true">✓ </span>Copied
                        </>
                      ) : (
                        'Copy'
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4">
                <div role="group" aria-labelledby={`${ids}-columns`}>
                  <p
                    id={`${ids}-columns`}
                    className="px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase"
                  >
                    Columns
                  </p>
                  <p className="px-2 py-1 text-sm text-muted">Backlog, always</p>
                  {columns.map((column) => (
                    <Box
                      key={column.status}
                      label={column.label}
                      checked={boxes.parts.includes(column.status as SharePart)}
                      onChange={(on) => tick(column.status as SharePart, on)}
                    />
                  ))}
                </div>

                <div role="group" aria-labelledby={`${ids}-also`}>
                  <p
                    id={`${ids}-also`}
                    className="px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase"
                  >
                    Also
                  </p>
                  {extras.map((extra) => (
                    <Box
                      key={extra.part}
                      label={extra.label}
                      checked={boxes.parts.includes(extra.part)}
                      onChange={(on) => tick(extra.part, on)}
                    />
                  ))}
                  <Box
                    label="My name"
                    checked={boxes.showsName}
                    onChange={(on) => choose({ ...boxes, showsName: on })}
                  />
                  {/* The name the box puts on the share, printed rather than left to be guessed:
                      users.display_name, fixed at first sign-in. */}
                  <p className="px-2 text-xs text-muted">{me?.displayName}</p>
                </div>
              </div>

              {failure !== null && (
                <p key={failure} role="alert" className="mt-3 px-2 text-xs text-danger">
                  {FAILED[failure]}
                </p>
              )}

              <div className="mt-5">
                {url === null ? (
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded px-2 py-1 text-sm text-muted hover:bg-hover hover:text-fg"
                    >
                      Cancel
                    </button>
                    {/* Held by aria-disabled while it works, for the spreadsheet row's measured
                        reason: a browser takes focus off a control the moment it is disabled. */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!make.isPending) {
                          setFailure(null);
                          make.mutate(draft);
                        }
                      }}
                      aria-disabled={make.isPending || undefined}
                      className="rounded border border-line px-3 py-1 text-sm font-medium hover:bg-hover aria-disabled:cursor-wait aria-disabled:text-muted"
                    >
                      {make.isPending ? 'Making the link…' : 'Make the link'}
                    </button>
                  </div>
                ) : confirming ? (
                  <div className="flex flex-col gap-2 rounded bg-danger/10 px-2 pt-1 pb-2 text-xs">
                    <p className="text-sm text-fg">Stop sharing?</p>
                    <p className="text-fg">The link stops working for everyone who has it.</p>
                    <div className="flex gap-2">
                      {/* ConfirmDelete's fill, for its reason: on Ember the accent is red too, and
                          a destructive control must not be one hue from a link. */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!stop.isPending) {
                            setFailure(null);
                            setDraft(boxes);
                            stop.mutate();
                          }
                        }}
                        aria-disabled={stop.isPending || undefined}
                        className="rounded bg-danger px-2 py-0.5 font-semibold text-danger-fg aria-disabled:cursor-wait"
                      >
                        {stop.isPending ? 'Stopping…' : 'Stop sharing'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!stop.isPending) {
                            setConfirming(false);
                          }
                        }}
                        className="rounded border border-line bg-surface px-2 py-0.5 text-muted hover:bg-hover hover:text-fg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setFailure(null);
                        setConfirming(true);
                      }}
                      className="rounded px-2 py-1 text-sm text-muted hover:bg-hover hover:text-fg"
                    >
                      Stop sharing
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded border border-line px-3 py-1 text-sm font-medium hover:bg-hover"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </>
  );
}

/**
 * One of the boxes: a real checkbox tinted with the accent, as the Columns group in Settings has —
 * picked there from screenshots over squares drawn to match the panel's dots.
 */
function Box({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-hover">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="accent-accent"
      />
      {label}
    </label>
  );
}
