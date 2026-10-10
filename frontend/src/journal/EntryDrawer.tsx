import { Fragment, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { finishQuestion, putBackAnswer, REPLAY_ANSWER } from '../lib/finishQuestion';
import { formatJournalDate } from '../lib/time';
import { useModalPanel } from '../lib/useModalPanel';
import { ColumnControl } from './ColumnControl';
import { ConfirmDelete } from './ConfirmDelete';
import { EntryForm, type EntryFormHandle } from './EntryForm';
import { HltbPin } from './HltbPin';
import { NoteList, noteRowId, type FoundNote } from './NoteList';
import { automaticGenre, hobbyDefinition, type BoardColumn, type TitleDetail } from '../hobbies';
import { formatHours } from '../lib/hours';
import { ratingTone } from '../lib/rating';
import { useJournalEntry } from './useJournalEntry';
import { useNotes } from './useNotes';
import type { LogEntry, LogStatus, UpdateLogEntry } from '../api/types';

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

export interface EntryDrawerProps {
  /**
   * Whose journal this is. Handed down from the board rather than worked out here: it keys the
   * drawer's cache apart from another hobby's, chooses which route the detail comes from, and
   * decides which fields a pass of this kind even has.
   */
  hobby: string;
  mediaId: number;
  onClose: () => void;
  /**
   * Opened from a card's *How long for me?* rather than its title, so "How long will it take me?"
   * starts open. Said on every opening by the board, never left over from the one before.
   */
  askHowLong?: boolean;
  /**
   * Opened from a note a search found: the journal brings that note into view, marks it and the
   * words it was found by, and gives it the keyboard. Said on every opening by the board, as
   * `askHowLong` is, so a note found once is never marked again in the next journal opened.
   */
  atNote?: FoundNote | null;
  /**
   * The columns the board draws, which are the ones the pass's heading offers. The board's one
   * list, as every card's menu is handed it, so a column taken off in Settings leaves both at
   * the same moment.
   */
  columns: readonly BoardColumn[];
  /**
   * Moves the title, which the board does: it is the drag's own mutation, so a move from here
   * moves the card, refetches the columns, the years, the calendar and the search strip's chips,
   * and applies the server's rules about which pass it touches. None of that is written twice.
   */
  onMove: (from: LogStatus, to: LogStatus) => Promise<unknown>;
  /**
   * Takes a finish back: the Completed pass itself goes to `to`, without its finish, rather than
   * a new pass starting there. The board's own mutation again, saying the finish never happened.
   */
  onPutBack: (to: LogStatus) => Promise<unknown>;
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
export function EntryDrawer({
  hobby,
  mediaId,
  onClose,
  askHowLong = false,
  atNote = null,
  columns,
  onMove,
  onPutBack,
}: EntryDrawerProps) {
  const { columnLabel, genres, journal } = hobbyDefinition(hobby);
  const { title, save, remove, setGenre, setHltbId, fieldErrors } = useJournalEntry(hobby, mediaId);
  const titleId = useId();
  const genreId = useId();
  const questionId = useId();
  const panel = useRef<HTMLElement>(null);
  // Which pass has been asked about, if any. One at a time, and by id rather than a flag,
  // because every row in the history carries the same control.
  const [confirming, setConfirming] = useState<number | null>(null);

  // Whether the form on screen matches what was last written.
  //
  // Here rather than in EntryForm, because it is the answer to a question about the write and
  // the write is this component's. Not read off save.isSuccess either: that stays true until the
  // next write, where this has to stop being true as soon as a field is touched. The drawer
  // unmounts when it closes, so opening another title starts with nothing claimed.
  const [saved, setSaved] = useState(false);

  // The keyboard follows the drawer in and stays there, and Escape closes it: aria-modal below
  // promises a screen reader that the board is inert while this is open, and the two are kept
  // honest together. Shared with the share dialog, which makes the same promise.
  useModalPanel(panel, onClose);

  const detail = title.data;

  // A note a search found is brought into view and given the keyboard, once, when the title it
  // is in has arrived: a screen reader then reads the note the search was for, rather than the
  // journal from its top. After useModalPanel, which gave the panel the keyboard as it opened,
  // because on a title already in the cache both run on the first render and the later one wins.
  //
  // Once rather than on every change to the title: a write refetches it with the note still
  // there, and taking the keyboard back each time would take it out of the field being typed
  // into. `scrollIntoView` is called if it is there, because jsdom has none.
  const loaded = detail !== undefined;
  useEffect(() => {
    if (!loaded || atNote === null) {
      return;
    }

    const found = document.getElementById(noteRowId(atNote.noteId));
    found?.focus({ preventScroll: true });
    found?.scrollIntoView?.({ block: 'center' });
  }, [loaded, atNote]);

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

  const deleteProps = (entry: LogEntry) => ({
    warning: detail === undefined ? null : deleteWarning(entry, detail, columnLabel),
    confirming: confirming === entry.id,
    busy: remove.isPending,
    error: remove.error === null ? null : remove.error.message,
    onAsk: () => setConfirming(entry.id),
    onCancel: () => setConfirming(null),
    onConfirm: () => deletePass(entry.id),
  });

  // Which column a Completed pass has been asked to leave for, while the drawer asks whether it
  // was finished. Leaving Completed either replays the title, keeping this pass under Earlier
  // passes, or takes a mistaken finish back and moves this pass itself, and only the reader knows
  // which. Since #14 the board asks the same question on a card, for a drag and the menu alike.
  const [asking, setAsking] = useState<LogStatus | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  // Where a move that is on its way is going. The heading names it at once, and the pass takes
  // nothing until the drawer holds the moved pass.
  const [moving, setMoving] = useState<LogStatus | null>(null);
  const control = useRef<HTMLButtonElement>(null);
  const answer = useRef<HTMLButtonElement>(null);
  const form = useRef<EntryFormHandle>(null);

  // Every write of the pass that has been sent and not yet answered, as one thing to wait on.
  //
  // A move has to come after them, not only after the one being sent as it starts: each write
  // carries the pass's column, so one still in flight could land behind the move and put the
  // pass back where it was. Chained rather than kept as the latest, because two can be in flight
  // at once — a save takes longer than the half second between two of them, on a slow phone.
  const writes = useRef<Promise<unknown>>(Promise.resolve());

  function savePass(entryId: number, update: UpdateLogEntry) {
    const sent = save.mutateAsync({ entryId, update });
    writes.current = Promise.allSettled([writes.current, sent]);

    // Failure is said by `save.error`, under the form; nothing here has more to add.
    sent.then(
      () => setSaved(true),
      () => {},
    );
  }

  // The question takes the keyboard when it appears: the list that asked it has just closed,
  // and the answer is what a keyboard needs next.
  useEffect(() => {
    if (asking !== null) {
      answer.current?.focus();
    }
  }, [asking]);

  /**
   * A move, in the only order that cannot undo itself.
   *
   * What the form owes goes first, and the move waits for every write still on its way; then the
   * move, which the board answers only once this drawer holds the moved pass. The form takes
   * nothing in between. Without that, a rating typed inside the half second before a move either
   * went after it carrying the old column, so the server moved the pass back, or went with the
   * old, empty Started over the start the move had stamped. Both were measured before the fix.
   *
   * `send` is the move itself: an ordinary one, a replay, or a finish put back. All three carry
   * the column, so all three race the autosave the same way and take the same order.
   */
  async function moveTo(to: LogStatus, send: () => Promise<unknown>) {
    setAsking(null);
    setMoveError(null);
    setMoving(to);

    try {
      form.current?.flush();
      await writes.current;
      await send();
    } catch (failure) {
      setMoveError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setMoving(null);
    }
  }

  function pick(from: LogStatus, to: LogStatus) {
    setMoveError(null);

    if (from === 'Completed') {
      setAsking(to);
      return;
    }

    void moveTo(to, () => onMove(from, to));
  }

  /** Where the keyboard goes once the question is answered either way: the heading it came from. */
  function answered() {
    control.current?.focus();
  }

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
          without prompting is safe because nothing here is waiting to be pressed: the pass
          writes itself and sends whatever it still owes on the way out, and the one thing left
          at risk is an unposted note, which is cheaper to retype than to guard. */}
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

            {/* The title's other name, for the one hobby whose titles have two. MAL states an
                English name and a romaji one, the English leads, and this is the other — the
                card's pair in the card's order, because this drawer opens off that card.

                Outside the <h2> rather than inside it, exactly as the card keeps it outside the
                <h3>: an accessible name carrying both names run together would be the one
                string nobody could search for. Absent rather than blank when there is nothing,
                which is every other hobby and most anime. */}
            {detail?.subtitle != null && (
              <p className="text-xs break-words text-muted">{detail.subtitle}</p>
            )}

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

                {/* A fact with somewhere to go is an anchor and the rest are spans — the way
                    back to MAL is the only one so far. It is still not a control: the genre
                    select above changes what the app holds, and this leaves the app entirely.

                    justify-self-start, because a grid child fills its track: without it the
                    underline and the click target would run the width of the drawer. New tab
                    and noreferrer, which is HltbPin's anchor exactly. */}
                {fact.href === undefined ? (
                  <span>{fact.value}</span>
                ) : (
                  <a
                    href={fact.href}
                    target="_blank"
                    rel="noreferrer"
                    className="justify-self-start underline hover:text-fg"
                  >
                    {fact.value}
                  </a>
                )}
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
          <PassSection
            entry={current}
            // The column the pass is in, and the way to another one. It keeps the band heading's
            // type, which is what made it match Journal as plain text; see ColumnControl.
            heading={(id) => (
              <ColumnControl
                ref={control}
                labelId={id}
                status={moving ?? current.status}
                moving={moving !== null}
                columns={columns}
                columnLabel={columnLabel}
                className={BAND_HEADING}
                onPick={(to) => pick(current.status, to)}
              />
            )}
          >
            {asking !== null && (
              <FinishQuestion
                id={questionId}
                column={columnLabel[asking]}
                completedAt={current.completedAt}
                answer={answer}
                onReplay={() => {
                  answered();
                  void moveTo(asking, () => onMove(current.status, asking));
                }}
                onPutBack={() => {
                  answered();
                  void moveTo(asking, () => onPutBack(asking));
                }}
                onCancel={() => {
                  setAsking(null);
                  answered();
                }}
              />
            )}

            {/* The board puts a card back when its move fails. The drawer has no card to put
                back, so it says so, under the heading that is still naming where the pass is. */}
            {moveError !== null && (
              <p role="alert" className="text-xs text-danger">
                {`Not moved. ${moveError}`}
              </p>
            )}

            <EntryForm
              // Remounts when a *different* pass becomes the current one, so the inputs reload
              // rather than keeping the last title's half-typed rating — opening another card,
              // or deleting the pass this one was about.
              //
              // Not on the values any more, which is what it used to be keyed on: the form
              // writes itself now, so the pass underneath is refetched half a second after
              // every keystroke, and a key that moved with it would hand the reader a new set
              // of DOM nodes and take the keyboard out of the field being typed into. The form
              // re-seeds from a changed pass instead — see passValues.
              key={current.id}
              hobby={hobby}
              entry={current}
              fields={journal.fields}
              platforms={detail.platforms}
              seasons={detail.seasons}
              episodeCount={detail.episodeCount}
              estimates={detail.hltb}
              completedLabel={columnLabel.Completed}
              ref={form}
              moving={moving !== null}
              saving={save.isPending}
              saved={saved}
              serverErrors={fieldErrors}
              saveError={save.error === null ? null : save.error.message}
              onSave={(update) => savePass(current.id, update)}
              onEdit={() => setSaved(false)}
              // On the Save row, hard right, rather than under it. It stood in the column every
              // field label stands in, at the size every field label is set in, saying one word —
              // so it read as a heading for whatever came next rather than as the button it is.
              // Beside Save it is unmistakably an action, and the two things you can do to this
              // pass end up on one line, at opposite ends, which is where a destructive one wants
              // to be relative to the ordinary one.
              actions={<ConfirmDelete label="Delete this pass" {...deleteProps(current)} />}
              askHowLong={askHowLong}
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

            <NoteList
              notes={current.notes}
              composeOpen
              found={atNote}
              {...noteProps(current.id)}
            />
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
                <PassSection
                  key={entry.id}
                  entry={entry}
                  // A row inside the group, so not the band's uppercase: two levels of the same
                  // shout, one inside the other, would be no heading at all.
                  heading={(id) => (
                    <p id={id} className="text-sm text-muted">
                      {headingFor(entry, columnLabel)}
                    </p>
                  )}
                >
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
                      {...deleteProps(entry)}
                    />
                  </div>

                  <NoteList
                    notes={entry.notes}
                    composeOpen={false}
                    found={atNote}
                    {...noteProps(entry.id)}
                  />
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
  /**
   * What the pass is called, carrying the id that names the region a screen reader can jump to.
   *
   * Handed the id rather than a string, because the two kinds of pass head themselves
   * differently. The current pass opens a band of the drawer, between two rules, the way the
   * header above it and the notes below it do, so its heading is in the band's uppercase — and
   * since 7 October 2026 it is a control as well, the way to another column. An earlier pass is
   * a row inside *Earlier passes*, with a plain heading and nothing to press.
   */
  heading: (id: string) => ReactNode;
  children: ReactNode;
}

/**
 * One pass and everything about it.
 *
 * A labelled region rather than a list item, which is how `Column` already solves the same
 * problem — several passes on one screen, each carrying identically-named controls, and tests
 * and screen readers both needing to say which one they mean.
 */
function PassSection({ entry, heading, children }: PassSectionProps) {
  const headingId = `pass-${entry.id}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      {heading(headingId)}
      {children}
    </section>
  );
}

interface FinishQuestionProps {
  id: string;
  /** Where the pass would go, in the hobby's own word. */
  column: string;
  /** The finish being asked about, or null when the pass carries none. */
  completedAt: string | null;
  /** The first answer, which takes the keyboard when the question appears. */
  answer: React.Ref<HTMLButtonElement>;
  onReplay: () => void;
  onPutBack: () => void;
  onCancel: () => void;
}

/**
 * Whether a Completed pass was finished, asked before it leaves for another column.
 *
 * Yes is a replay: a new pass starts there, and this one stays under *Earlier passes*, finished.
 * No is a finish put back: this pass goes there itself, and its finish date goes. Until #14 there
 * was only the yes, so a mistaken finish moved back left a blank pass above the real one, and the
 * real one was then deleted to tidy up, notes and all. The words are `lib/finishQuestion.ts`'s,
 * which the board's cards ask with too.
 *
 * A tinted box, the user's pick at the #13 workshop over a line in the Delete confirm's shape: the
 * one boxed thing in the pass, so it cannot be read past. Not red and not a fill, because neither
 * answer loses anything. Both answers carry the question as their description, so a screen reader
 * that lands on one hears what it is answering.
 */
function FinishQuestion({
  id,
  column,
  completedAt,
  answer,
  onReplay,
  onPutBack,
  onCancel,
}: FinishQuestionProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line-soft bg-well p-3 text-xs">
      <p id={id}>{finishQuestion(completedAt)}</p>
      <div className="flex flex-wrap gap-2">
        <button
          ref={answer}
          type="button"
          aria-describedby={id}
          onClick={onReplay}
          className="rounded border border-line bg-surface px-2 py-0.5 font-medium hover:bg-hover"
        >
          {REPLAY_ANSWER}
        </button>
        <button
          type="button"
          aria-describedby={id}
          onClick={onPutBack}
          className="rounded border border-line bg-surface px-2 py-0.5 font-medium hover:bg-hover"
        >
          {putBackAnswer(column)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded border border-line bg-surface px-2 py-0.5 text-muted hover:bg-hover hover:text-fg"
        >
          Cancel
        </button>
      </div>
    </div>
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

/** A pass named for a reader who cannot see its row: "the Completed pass from Nov 2, 2024". */
function passName(entry: LogEntry, label: ColumnLabel): string {
  const when = whenOf(entry);
  return `the ${label[entry.status]} pass${when === null ? '' : ` from ${when}`}`;
}

/** Which pass a delete button in the history would take, for a reader who cannot see the row. */
function labelFor(entry: LogEntry, label: ColumnLabel): string {
  return `Delete ${passName(entry, label)}`;
}

/**
 * What deleting a pass costs beyond it, said in its confirm before anything goes. Null when it
 * costs nothing more, which is any pass with no notes while another stays.
 *
 * Its notes move to the current pass of the ones that stay. That is the server's rule, in
 * `LogEntryService.DeleteAsync`, and this list arrives in the order the server picks that pass
 * by, so the first pass in it that is not the one going is the one that keeps them. It is "the
 * current pass" unless the current pass is the one going, and then it is named the way its own
 * Delete names it. With no pass left, the title leaves the board and the notes go with it, and
 * the confirm counts them.
 *
 * Until #15 an earlier pass's confirm said nothing, and nine notes went that way. The words were
 * picked from renders on 9 October 2026, in `docs/plans/games-board-next.md`.
 */
function deleteWarning(
  entry: LogEntry,
  detail: TitleDetail,
  label: ColumnLabel,
): string | null {
  const passes = detail.logEntries;
  const count = entry.notes.length;
  const keeper = passes.find((other) => other.id !== entry.id);

  if (keeper === undefined) {
    const notes = count === 0 ? '' : count === 1 ? ', and its note' : `, and its ${count} notes`;
    return `The only pass — deleting it takes ${detail.title} off your board${notes}.`;
  }

  if (count === 0) {
    return null;
  }

  const where = keeper === passes[0] ? 'the current pass' : passName(keeper, label);
  return count === 1 ? `Its note moves to ${where}.` : `Its ${count} notes move to ${where}.`;
}
