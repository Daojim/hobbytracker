import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { formatJournalDate } from '../lib/time';
import { ConfirmDelete } from './ConfirmDelete';
import { EntryForm } from './EntryForm';
import { HltbPin } from './HltbPin';
import { NoteList } from './NoteList';
import { automaticGenre, hobbyDefinition } from '../hobbies';
import { entrySeed } from './fields';
import { formatHours } from '../lib/hours';
import { ratingTone } from '../lib/rating';
import { useJournalEntry } from './useJournalEntry';
import { useNotes } from './useNotes';
import type { LogEntry, LogStatus } from '../api/types';

/**
 * What a person calls each column, which is not what the protocol calls it: `InProgress` is
 * Playing on a games board and Watching on a films one. This file kept its own copy of that map
 * for as long as there was one hobby to disagree with it — the board's copy and this one now
 * come from the same place.
 */
type ColumnLabel = Record<LogStatus, string>;

/**
 * What a band of the drawer is titled in.
 *
 * Shared rather than written twice, because the pass's heading and the journal's are the same
 * thing at the same level and the whole point of them is that they match. It is the type
 * "Earlier passes" already wears, which is the app's one way of saying "a section starts here".
 */
const BAND_HEADING = 'text-xs font-medium tracking-wide text-muted uppercase';

/** What Tab can land on. Mirrors the browser's own idea of it closely enough for one panel. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface EntryDrawerProps {
  /**
   * Whose journal this is. Handed down from the board rather than worked out here: it keys the
   * drawer's cache apart from another hobby's, chooses which route the detail comes from, and
   * decides which fields a pass of this kind even has.
   */
  hobby: string;
  mediaId: number;
  onClose: () => void;
}

/**
 * Journalling a title, over the board rather than away from it.
 *
 * Rating, notes and dates were reachable by the API and by nothing else — the card has always
 * rendered a rating that could never be set. This is where they become real.
 *
 * One drawer for every hobby, and the differences between them are of two kinds. The words are
 * data and come from the registry: what a column is called, what the finished date is called.
 * The regions are not — a film's pass is missing two of a game's six fields rather than holding
 * them blank — so those are read off the loaded title, which says what it has rather than what
 * it is. Neither kind is a branch on the slug, and that is the point: `if (hobby === 'movies')`
 * would be six branches by the time books land.
 */
export function EntryDrawer({ hobby, mediaId, onClose }: EntryDrawerProps) {
  const { columnLabel, genres, journal } = hobbyDefinition(hobby);
  const { title, save, remove, setGenre, setHltbId, fieldErrors } = useJournalEntry(hobby, mediaId);
  const titleId = useId();
  const genreId = useId();
  const panel = useRef<HTMLElement>(null);
  // Which pass has been asked about, if any. One at a time, and by id rather than a flag,
  // because every row in the history carries the same control.
  const [confirming, setConfirming] = useState<number | null>(null);

  // Whether the form on screen matches what was last written.
  //
  // Here rather than in EntryForm, which is keyed on the values it was seeded from and so
  // remounts on any save that changed one — a flag set on success would be wiped by the very
  // refetch that confirms it. Not read off save.isSuccess either: that stays true until the next
  // write, where this has to stop being true as soon as a field is touched. The drawer unmounts
  // when it closes, so opening another title starts with nothing claimed.
  const [saved, setSaved] = useState(false);

  // The keyboard follows the drawer in. Without this the focus is still on the board behind,
  // and the first Tab walks the columns rather than the form that just opened.
  useEffect(() => {
    panel.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || panel.current === null) {
        return;
      }

      // aria-modal below promises a screen reader that the board is inert while this is open.
      // Letting Tab walk out onto it would make that promise false for anyone who reads by
      // tabbing, so the two are kept honest together.
      const stops = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (first === undefined || last === undefined) {
        return;
      }

      const here = document.activeElement;
      if (event.shiftKey && (here === first || here === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && here === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const detail = title.data;
  // The API orders entries logged_at DESC, id DESC — the same rule the board decides "current"
  // by — so the first one is the pass the card is showing. Re-deriving that here would be a
  // fourth copy of an ordering that has already drifted once.
  const current = detail?.logEntries[0];
  const earlier = detail?.logEntries.slice(1) ?? [];
  const onlyPass = detail !== undefined && detail.logEntries.length === 1;

  // The title's own genres, plus whatever is already chosen when that list has stopped
  // mentioning it. Exactly the platform select's rule, for exactly its reason.
  const genreOptions =
    detail === undefined || detail.primaryGenre === null
      ? (detail?.genres ?? [])
      : detail.genres.includes(detail.primaryGenre)
        ? detail.genres
        : [...detail.genres, detail.primaryGenre];

  function deletePass(entryId: number) {
    // Read before the mutation, because by the time it answers the refetch has already changed
    // what the drawer is holding.
    const wasTheLast = onlyPass;

    remove.mutate(entryId, {
      onSuccess: () => {
        setConfirming(null);
        if (wasTheLast) {
          onClose();
        }
      },
    });
  }

  const deleteProps = (entryId: number) => ({
    confirming: confirming === entryId,
    busy: remove.isPending,
    error: remove.error === null ? null : remove.error.message,
    onAsk: () => setConfirming(entryId),
    onCancel: () => setConfirming(null),
    onConfirm: () => deletePass(entryId),
  });

  const notes = useNotes(hobby, mediaId);
  const noteError = [notes.write.error, notes.rewrite.error, notes.remove.error].find(
    (failure) => failure !== null,
  );

  const noteProps = (entryId: number) => ({
    busy: notes.write.isPending || notes.rewrite.isPending || notes.remove.isPending,
    error: noteError?.message ?? null,
    onWrite: (body: string) => notes.write.mutate({ entryId, body }),
    onRewrite: (noteId: number, body: string) => notes.rewrite.mutate({ noteId, body }),
    onDelete: (noteId: number) => notes.remove.mutate(noteId),
  });

  return (
    <>
      {/* Presentation rather than aria-hidden: `aria-modal` on the panel is already what tells
          a screen reader the board behind is inert, and this exists for the pointer. Closing
          without prompting is safe because every sub-form has its own explicit save — the one
          thing at risk is an unposted draft, which is cheaper to retype than to guard. */}
      <div
        role="presentation"
        onClick={onClose}
        className="fixed inset-0 z-10 bg-scrim"
      />

      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col gap-4 overflow-y-auto border-l border-line bg-surface p-5 shadow-xl outline-none 2xl:max-w-lg modal:inset-4 modal:m-auto modal:h-fit modal:max-h-[86vh] modal:max-w-2xl modal:rounded-xl modal:border modal:p-6 3xl:modal:max-w-3xl"
      >
        <div className="flex items-start gap-3">
          {/* The title and its byline are one thing, so they are one element. They were two
              children of the panel before, which put the panel's own `gap-4` between them — the
              spacing that separates the three bands from each other, doing the job of separating
              a heading from the line that belongs to it. A byline is not a band. */}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold">
              {detail?.title ?? 'Loading…'}
            </h2>

            {/* Who made it, and nothing else — the developer of a game, the director of a film.
                This carried the platforms too while it was the game's only byline, but they have
                a control of their own further down: a list of them here was a spec sheet where a
                name belongs. Which name it is, is the hobby's to say; that it is a name is not. */}
            {detail !== undefined && detail.byline.length > 0 && (
              <p className="text-xs text-muted">{detail.byline.join(', ')}</p>
            )}
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="h-6 w-6 shrink-0 rounded text-muted hover:bg-hover hover:text-fg"
          >
            ×
          </button>
        </div>

        {title.error !== null && (
          <p role="alert" className="text-sm text-danger">
            {title.error.message}
          </p>
        )}

        {/* What belongs to the title rather than to a pass, in one band.

            All of it sits in the header for the same reason: it describes the title, where
            EntryForm below submits one PUT about a pass to a different endpoint — putting any
            of it there would mean one form writing to two places.

            A grid rather than two independent rows, so the two controls share a left edge.
            `max-content` on the first track is what lets the wider label set the column for both
            without either of them naming a width — the alternative was the same magic number
            written down twice, in two files, agreeing by luck.

            HltbPin renders straight into these tracks rather than into a wrapper of its own. The
            coupling is stated at its own top too, since a component that has to sit inside a
            particular grid is not a thing to discover from the outside. */}
        {detail !== undefined && (
          <div className="grid grid-cols-[max-content_1fr] items-center gap-x-3 gap-y-2 text-xs text-muted">
            <label htmlFor={genreId} className="font-medium">
              Genre
            </label>
            <select
              id={genreId}
              value={detail.primaryGenre ?? ''}
              onChange={(event) =>
                setGenre.mutate(event.target.value === '' ? null : event.target.value)
              }
              className="justify-self-start rounded border border-line bg-surface px-1 py-0.5 text-xs"
            >
              {/* Not "Not recorded": null here means "use the automatic pick", so the option
                  says which one that is. Read against this hobby's list — TMDB's vocabulary and
                  IGDB's overlap barely at all, so the wrong list would name nothing. */}
              <option value="">{`Automatic — ${automaticGenre(genres, detail.genres) ?? 'none'}`}</option>
              {genreOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            {/* Facts about the title, in the tracks the two controls above them share: a film's
                runtime, and nothing at all for a game. Rendered as text rather than as anything
                you can operate, because that is exactly what separates them from the genre — one
                is a choice of yours and the other is what TMDB says. */}
            {detail.facts.map((fact) => (
              <Fragment key={fact.label}>
                <span className="font-medium">{fact.label}</span>
                <span>{fact.value}</span>
              </Fragment>
            ))}

            {/* Only where there is something to correct. A film's length is a fact TMDB knows
                exactly, so there is no matcher to have got it wrong and no id to pin — and the
                same null that takes the pin away takes the four estimate tiers off the pass. */}
            {detail.hltb !== null && (
              <HltbPin
                // Re-seeds when the stored id changes — after a pin of your own, or after the
                // queue matches the title while the drawer is open. EntryForm is keyed for the
                // same reason: useState reads its initial value once. A refused pin leaves the
                // id alone, so what was typed stays in the box to be corrected.
                key={detail.hltb.id}
                hltbId={detail.hltb.id}
                saving={setHltbId.isPending}
                error={setHltbId.error === null ? null : setHltbId.error.message}
                onPin={(hltbId) => setHltbId.mutate(hltbId)}
              />
            )}
          </div>
        )}

        {/* Everything above is about the game; everything below is about one pass through it.
            The rule is where that changes, and it is the same `border-line-soft` the settings
            menu puts between its three groups. */}
        {detail !== undefined && <hr className="border-line-soft" />}

        {current !== undefined && detail !== undefined && (
          <PassSection entry={current} heading={columnLabel[current.status]} lead>
            <EntryForm
              // Remounts when a different card is opened, so the inputs reload rather than
              // keeping the last title's half-typed rating — and when this pass changes
              // underneath the drawer, which a drag does without changing its id. See entrySeed.
              key={entrySeed(current)}
              entry={current}
              fields={journal.fields}
              platforms={detail.platforms}
              seasons={detail.seasons}
              episodeCount={detail.episodeCount}
              estimates={detail.hltb}
              completedLabel={columnLabel.Completed}
              saving={save.isPending}
              saved={saved}
              serverErrors={fieldErrors}
              onSave={(update) =>
                save.mutate(
                  { entryId: current.id, update },
                  { onSuccess: () => setSaved(true) },
                )
              }
              onEdit={() => setSaved(false)}
              // On the Save row, hard right, rather than under it. It stood in the column every
              // field label stands in, at the size every field label is set in, saying one word —
              // so it read as a heading for whatever came next rather than as the button it is.
              // Beside Save it is unmistakably an action, and the two things you can do to this
              // pass end up on one line, at opposite ends, which is where a destructive one wants
              // to be relative to the ordinary one.
              actions={
                <ConfirmDelete
                  label="Delete this pass"
                  warning={
                    onlyPass
                      ? `The only pass — deleting it takes ${detail.title} off your board.`
                      : null
                  }
                  {...deleteProps(current.id)}
                />
              }
            />

            {/* The pass ends and the writing about it begins. Same rule as the header's, and the
                reason the notes are outside the form in the first place: each note is its own row
                and its own write, so nothing above this line reaches anything below it.

                `my-1` because the two rules sit in containers with different gaps — the header's
                is a child of the panel at gap-4, this one a child of the pass at gap-3 — so
                without it the second is 12px clear of its neighbours where the first is 16px, and
                two rules doing the same job at different weights reads as a mistake. */}
            <hr className="my-1 border-line-soft" />

            {/* The third band gets a heading like the other two. It says Journal rather than
                Notes because that is what this drawer is called everywhere else — the card's
                menu opens a journal, and every other hobby gets the word unmodified. */}
            <p className={BAND_HEADING}>Journal</p>

            <NoteList notes={current.notes} composeOpen {...noteProps(current.id)} />
          </PassSection>
        )}

        {earlier.length > 0 && (
          <section className="mt-2 border-t border-line-soft pt-3">
            {/* A finished pass's own fields are read-only. It is a record of something that
                happened, and the schema goes to some trouble to keep it — offering to edit the
                dates here would undo that with a keystroke.

                Its notes are not, and neither is the pass itself. A note is yours to fix, and a
                pass that never happened is not a record worth keeping. */}
            <h3 className="mb-2 text-xs font-medium tracking-wide text-muted uppercase">
              Earlier passes
            </h3>

            <div className="flex flex-col gap-4">
              {earlier.map((entry) => (
                <PassSection key={entry.id} entry={entry} heading={headingFor(entry, columnLabel)}>
                  <div className="flex flex-wrap items-baseline gap-2 text-sm">
                    {entry.rating !== null && (
                      <span
                        role="img"
                        aria-label={`Rated ${entry.rating.toFixed(1)} out of 10`}
                        className={`text-xs font-semibold ${ratingTone(entry.rating)}`}
                      >
                        ★ {entry.rating.toFixed(1)}
                      </span>
                    )}
                    {entry.hoursPlayed !== null && (
                      <span className="text-xs text-muted">
                        {formatHours(entry.hoursPlayed)}
                      </span>
                    )}
                    {entry.platform !== null && (
                      <span className="text-xs text-muted">{entry.platform}</span>
                    )}
                    <ConfirmDelete
                      // Named rather than a bare "Delete", because every pass carries one and a
                      // reader who cannot see which one it sits on would hear the same word over
                      // and over.
                      label={labelFor(entry, columnLabel)}
                      warning={null}
                      {...deleteProps(entry.id)}
                    />
                  </div>

                  <NoteList notes={entry.notes} composeOpen={false} {...noteProps(entry.id)} />
                </PassSection>
              ))}
            </div>
          </section>
        )}
      </aside>
    </>
  );
}

interface PassSectionProps {
  entry: LogEntry;
  /** What the pass is called, and what names the region a screen reader can jump to. */
  heading: string;
  /**
   * Whether this is the pass the drawer is *about*, rather than one of the ones underneath it.
   *
   * Only the styling differs, and it differs because the two are not the same kind of thing. The
   * current pass opens a band of the drawer, between two rules, the way the header above it and
   * the notes below it do — so it takes the uppercase heading this app already uses for a band,
   * the one "Earlier passes" itself wears. An earlier pass is a row inside that group, and
   * giving it the same weight would put two levels of the same shout inside one another.
   */
  lead?: boolean;
  children: ReactNode;
}

/**
 * One pass and everything about it.
 *
 * A labelled region rather than a list item, which is how `Column` already solves the same
 * problem — several passes on one screen, each carrying identically-named controls, and tests
 * and screen readers both needing to say which one they mean.
 */
function PassSection({ entry, heading, lead = false, children }: PassSectionProps) {
  const headingId = `pass-${entry.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <p
        id={headingId}
        className={lead ? BAND_HEADING : 'text-sm text-muted'}
      >
        {heading}
      </p>
      {children}
    </section>
  );
}

/** When the pass ended, or when it started if it never did. Mirrors the card's `lastActivity`. */
function whenOf(entry: LogEntry): string | null {
  return formatJournalDate(entry.completedAt ?? entry.startedAt);
}

/**
 * What names an earlier pass's region: "Completed Nov 2, 2024" on a game, "Watched Nov 2, 2024"
 * on a film, or just the column's name where there is no date to give.
 */
function headingFor(entry: LogEntry, label: ColumnLabel): string {
  const when = whenOf(entry);
  return when === null ? label[entry.status] : `${label[entry.status]} ${when}`;
}
/** Which pass a delete button in the history would take, for a reader who cannot see the row. */
function labelFor(entry: LogEntry, label: ColumnLabel): string {
  const when = whenOf(entry);
  return `Delete the ${label[entry.status]} pass${when === null ? '' : ` from ${when}`}`;
}
