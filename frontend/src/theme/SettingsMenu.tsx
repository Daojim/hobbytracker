import { type ReactNode, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DeleteAccount } from '../account/DeleteAccount';
import { useDeleteAccount } from '../account/useDeleteAccount';
import { setCardShows, useCardShows } from '../board/cardShows';
import { hiddenKey } from '../board/keys';
import { EyeOff } from '../discover/EyeOff';
import { HiddenDialog, forgetHidden } from '../discover/HiddenDialog';
import { SIDE_BY_SIDE } from '../board/grid';
import { canHide, setColumnHidden, useHiddenColumns } from '../board/hiddenColumns';
import { downloadSpreadsheet } from '../export/download';
import { columnsFor, hobbyDefinition } from '../hobbies';
import { HLTB_TIER_LABELS } from '../journal/fields';
import { clearPace, formatPace, usePace } from '../lib/pace';
import { DATE_ORDERS, setDateOrder, useDateOrder } from '../lib/time';
import { useMediaQuery } from '../lib/useMediaQuery';
import { useModalPanel } from '../lib/useModalPanel';
import { WHEEL_SPINS, setWheelSpin, useWheelSpin } from '../pick/wheelSpin';
import { ShareDialog } from '../share/ShareDialog';
import { SharingRow } from '../share/SharingRow';
import { HOBBIES, type Hobby } from '../shell/hobbies';
import { setHeaderBoard, useHeaderBoards } from '../shell/headerBoards';
import { setOpeningBoard, useOpeningBoard } from '../shell/openingBoard';
import { DENSITIES, JOURNAL_VIEWS } from './theme';
import { HEADER_ICON_BUTTON } from './ThemeMenu';
import { useTheme } from './useTheme';

export interface SettingsMenuProps {
  /** The board this sits over, whose settings the dialog's second half holds. */
  hobby: Hobby;
}

/**
 * The gear in the header, and the Settings dialog behind it.
 *
 * **A dialog since #27, where it was a 224px panel under a button.** The themes went to a control
 * of their own beside this, and seven settings came in; the panel would have been about 1,510px
 * tall with them, against the 1,009 it was and the themes' 276 the user wanted gone. So it is a
 * dialog, 768px across from 768px (the user's pick over the journal modal's 672), with *Every
 * board* beside this board's settings and *Your data* across the foot, and one scrolling column on
 * a phone. Each choice is one line, its name and a switch, where the panel had a heading and rows.
 *
 * A gear rather than the word, the user's own addition at round two, beside the palette: two icons
 * keep a 390 phone's header one row. Named *Settings* for a voice and in a tooltip.
 *
 * The spreadsheet and the delete are held up here rather than in the dialog, so shutting it while
 * the file is being made, or while the account is being deleted, loses neither: opened again, the
 * dialog finds each still going.
 *
 * The share dialog is held here for the same reason the panel held it: its row is in the dialog,
 * which shuts as the share dialog opens, so that is the one thing open, and closing it hands the
 * keyboard back to the gear.
 */
export function SettingsMenu({ hobby }: SettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [listingHidden, setListingHidden] = useState(false);

  const spreadsheet = useSpreadsheet(hobby);
  const deletion = useDeleteAccount();

  const button = useRef<HTMLButtonElement>(null);
  const handBack = () => button.current?.focus();

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Settings"
        title="Settings"
        className={HEADER_ICON_BUTTON}
      >
        <Gear />
      </button>

      {open && (
        <SettingsDialog
          hobby={hobby}
          spreadsheet={spreadsheet}
          deletion={deletion}
          onClose={() => {
            setOpen(false);
            handBack();
          }}
          onShare={() => {
            setOpen(false);
            setSharing(true);
          }}
          onHidden={() => {
            setOpen(false);
            setListingHidden(true);
          }}
        />
      )}

      {sharing && (
        <ShareDialog
          hobby={hobby}
          onClose={() => {
            setSharing(false);
            handBack();
          }}
        />
      )}

      {listingHidden && (
        <HiddenList
          hobby={hobby}
          onClose={() => {
            setListingHidden(false);
            handBack();
          }}
        />
      )}
    </>
  );
}

function useSpreadsheet(hobby: Hobby) {
  return useMutation({ mutationFn: () => downloadSpreadsheet(hobby) });
}

interface SettingsDialogProps {
  hobby: Hobby;
  spreadsheet: ReturnType<typeof useSpreadsheet>;
  deletion: ReturnType<typeof useDeleteAccount>;
  onClose: () => void;
  onShare: () => void;
  onHidden: () => void;
}

/** The boards `/` can open on: every built one, in the nav's order. */
const OPENING_BOARDS = HOBBIES.filter((each) => each.ready).map((each) => ({
  value: each.slug,
  label: each.label,
}));

/** A group's heading: the panel's, kept. */
const HEADING = 'px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase';

/** A half's heading, and Your data's. */
const HALF = 'px-2 pb-1 text-sm font-semibold';

/** A row that does something: Share this board…, Download a spreadsheet. */
const ROW = 'flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-hover';

/** The line under a row or a group, saying what it holds. */
const LINE = 'px-2 pt-0.5 pb-1 text-xs text-muted';

function SettingsDialog({
  hobby,
  spreadsheet,
  deletion,
  onClose,
  onShare,
  onHidden,
}: SettingsDialogProps) {
  const { density, journalView, setDensity, setJournalView } = useTheme();
  const definition = hobbyDefinition(hobby);
  const hidden = useHiddenColumns(hobby);
  const shows = useCardShows(hobby);
  const openingBoard = useOpeningBoard();
  const headerOff = useHeaderBoards();
  const dates = useDateOrder();
  const wheel = useWheelSpin(hobby);

  // Not drawn on a phone, where the journal fills the screen whichever is chosen; the stored
  // choice still applies when the same browser is wider. React's to know, as the board's
  // columns are, so a test can say it is a phone.
  const sideBySide = useMediaQuery(SIDE_BY_SIDE, true);

  const ids = useId();
  const panel = useRef<HTMLElement>(null);
  useModalPanel(panel, onClose);

  const board = HOBBIES.find((each) => each.slug === hobby)!.label;

  return (
    <>
      {/* The share dialog's scrim and frame, centred from 768px as the picker's is since #26,
          and 16px down on a phone, where it scrolls as a whole. */}
      <div role="presentation" onClick={onClose} className="fixed inset-0 z-40 bg-scrim" />

      <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4">
        <section
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${ids}-title`}
          tabIndex={-1}
          className="pointer-events-auto w-full max-w-md rounded-xl border border-line bg-surface p-5 text-fg shadow-xl outline-none md:my-auto md:max-w-3xl"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id={`${ids}-title`} className="text-lg font-semibold">
              Settings
            </h2>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="h-6 w-6 shrink-0 rounded text-muted hover:bg-hover hover:text-fg"
            >
              ×
            </button>
          </div>

          <div className="mt-3 grid gap-x-6 gap-y-5 md:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-5">
              <div role="group" aria-labelledby={`${ids}-every`} className="min-w-0">
                <h3 id={`${ids}-every`} className={HALF}>
                  Every board
                </h3>
                <div className="flex flex-col gap-1">
                  <Choice name="Density" value={density} options={DENSITIES} onChange={setDensity} />
                  {sideBySide && (
                    <Choice
                      name="Journal"
                      value={journalView}
                      options={JOURNAL_VIEWS}
                      onChange={setJournalView}
                    />
                  )}
                  {/* Where `/` lands: the four built boards, Games until chosen. */}
                  <Choice
                    name="Opens on"
                    value={openingBoard}
                    options={OPENING_BOARDS}
                    onChange={setOpeningBoard}
                  />
                  {/* Each answer written as it would show a day, which says the choice better
                      than *Month first* would. */}
                  <Choice name="Dates" value={dates} options={DATE_ORDERS} onChange={setDateOrder} />

                  {/* Which boards the nav names: any but the one you are on, Books and Music
                      among them. The one you are on is left out of the list rather than offered
                      as a box that could never be unticked, as Columns does Backlog, and the line
                      says so: the nav names it whatever is ticked. */}
                  <Boxes
                    name="Boards in the header"
                    items={HOBBIES.filter((each) => each.slug !== hobby).map((each) => ({
                      key: each.slug,
                      label: each.label,
                      checked: !headerOff.has(each.slug),
                      onChange: (shown) => setHeaderBoard(each.slug, shown),
                    }))}
                    note={`${board} stays while you’re on it.`}
                  />

                </div>
              </div>
            </div>

            <div role="group" aria-labelledby={`${ids}-board`} className="min-w-0">
              <h3 id={`${ids}-board`} className={HALF}>
                {board}
              </h3>
              <div className="flex flex-col gap-1">
                {/* The board's columns, in its own words — Playing here, Watching on a films
                    board — and for this board only, because a film is seldom put on hold and a
                    game often is. Ticked means shown, and the group never says "hide": on the
                    board that word already means *fold*. Taking a column off draws it nowhere,
                    fetches nothing and offers no move to it; every title in it stays where it was.

                    Backlog is left out rather than offered as a disabled box: a disabled control
                    claims it would work under some other condition, and there is none, because
                    search adds every title there. The line under the group says so. */}
                <Boxes
                  name="Columns"
                  items={columnsFor(hobby)
                    .filter((column) => canHide(column.status))
                    .map((column) => ({
                      key: column.status,
                      label: column.label,
                      checked: !hidden.has(column.status),
                      onChange: (shown) => setColumnHidden(hobby, column.status, !shown),
                    }))}
                  note="Backlog always shows, because search adds to it."
                />

                {/* What a card shows: the last note, its words and its picture together, the
                    user's pick over a box for the picture apart; and the length, in the board's
                    word for it. Every other part of a card says what the title is. */}
                <Boxes
                  name="Cards"
                  items={[
                    {
                      key: 'note',
                      label: 'The last note',
                      checked: shows.note,
                      onChange: (shown) => setCardShows(hobby, 'note', shown),
                    },
                    {
                      key: 'length',
                      label: definition.lengthLabel,
                      checked: shows.length,
                      onChange: (shown) => setCardShows(hobby, 'length', shown),
                    },
                  ]}
                />

                {/* Where the board has HowLongToBeat's figures, which the question answers
                    from: the data's say, never the slug. */}
                {definition.journal.setHltbId !== null && <YourPace hobby={hobby} />}

                {/* Where the board has a wheel: Skip the spin shows the pick at once, as reduced
                    motion does, for somebody without it set on the device. */}
                {definition.picker !== null && (
                  <Choice
                    name="The wheel"
                    value={wheel}
                    options={WHEEL_SPINS}
                    onChange={(spin) => setWheelSpin(hobby, spin)}
                  />
                )}

                {/* A read-only link to this board: one row, which opens a dialog with room for the
                    address and what the link shows, and shuts this one as it opens. */}
                {definition.share !== null && <SharingRow hobby={hobby} onOpen={onShare} />}

                {/* The games hidden from Discover, counted, and opening #23's list of them: where
                    the board has Discover. */}
                {definition.discover !== null && <HiddenRow hobby={hobby} onOpen={onHidden} />}
              </div>
            </div>
          </div>

          {/* What you have, rather than how it looks: the board as a file you keep, and the
              account you could delete. On every board, because an account is every board's, and
              across the foot, the user's pick over under Every board.

              The spreadsheet's row only where the board's hobby has words for one. Held still
              while it works by aria-disabled rather than disabled: a real browser takes focus off
              a control the moment it is disabled, which would leave the keyboard nowhere with the
              file still coming. The line under it says what the file holds, and becomes the alert
              when it fails — a new element, keyed, so it is announced as it arrives.

              The delete comes last and is tinted, as the card menu's Remove from board is: plain
              rows do things, and the tinted one deletes. */}
          <hr className="my-4 border-line-soft" />

          <div role="group" aria-labelledby={`${ids}-data`}>
            <h3 id={`${ids}-data`} className={HALF}>
              Your data
            </h3>
            <div className="grid items-start gap-x-6 md:grid-cols-2">
              {definition.export !== null ? (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!spreadsheet.isPending) {
                        spreadsheet.mutate();
                      }
                    }}
                    aria-disabled={spreadsheet.isPending || undefined}
                    aria-describedby={`${ids}-spreadsheet`}
                    className={`${ROW} aria-disabled:cursor-wait aria-disabled:text-muted aria-disabled:hover:bg-transparent`}
                  >
                    <DownloadGlyph />
                    {spreadsheet.isPending ? 'Preparing…' : 'Download a spreadsheet'}
                  </button>
                  {spreadsheet.isError ? (
                    <p
                      key="failed"
                      id={`${ids}-spreadsheet`}
                      role="alert"
                      className="px-2 pt-0.5 pb-1 text-xs text-danger"
                    >
                      Couldn’t make the spreadsheet. Try again.
                    </p>
                  ) : (
                    <p key="holds" id={`${ids}-spreadsheet`} className={LINE}>
                      {definition.export.holds}
                    </p>
                  )}
                </div>
              ) : (
                <span />
              )}

              <div className="flex flex-col">
                <DeleteAccount deletion={deletion} />
              </div>
            </div>
          </div>

          {/* Credits, and the one part of Settings that is a requirement rather than a
              preference. TMDB's API terms ask for this sentence near-verbatim in an About or
              Credits area; the app has no About section, so Settings is it. Text rather than
              their logo, deliberately: the mark has its own rules about size, placement and
              alteration, and a sentence cannot breach them. IGDB is named beside it because
              crediting one provider and not the other would read as an oversight. */}
          <p className="mt-4 px-2 text-[11px] leading-snug text-muted">
            Game data from IGDB. This product uses the TMDB API but is not endorsed or certified
            by TMDB.
          </p>
        </section>
      </div>
    </>
  );
}

/**
 * Your pace, from "How long will it take me?" in a game's journal (#4), shown and cleared here
 * since #27, where it was only ever set and changed through the question. How much you play and
 * the figure you play to, *2 h a day · Main story*, in the question's own words for each.
 *
 * Clear forgets both, the user's pick over the pace alone. Its button goes with the pace, and the
 * keyboard would go with it, out of the dialog onto the page behind, where the next Tab would walk;
 * so it lands on the line, which now says *Not set*. Programmatic, and drawn without a ring, as
 * the sign-in card's heading is when the page puts the keyboard there.
 */
function YourPace({ hobby }: { hobby: Hobby }) {
  const { pace, style } = usePace(hobby);
  const id = useId();
  const said = useRef<HTMLSpanElement>(null);

  const noun = hobbyDefinition(hobby).titleNoun(1);
  const tier = style !== null && style in HLTB_TIER_LABELS
    ? HLTB_TIER_LABELS[style as keyof typeof HLTB_TIER_LABELS]
    : null;

  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className={HEADING}>
        Your pace
      </p>
      <div className="flex items-center justify-between gap-2 px-2 py-1">
        <span ref={said} tabIndex={-1} className="text-sm focus:outline-none">
          {pace === null ? 'Not set' : `${formatPace(pace)}${tier === null ? '' : ` · ${tier}`}`}
        </span>
        {(pace !== null || style !== null) && (
          <button
            type="button"
            onClick={() => {
              clearPace(hobby);
              said.current?.focus();
            }}
            className="h-6 rounded border border-line px-2 text-xs font-medium hover:bg-hover"
          >
            Clear
          </button>
        )}
      </div>
      <p className={LINE}>
        {pace === null
          ? `How long will it take me? in a ${noun}’s journal sets it.`
          : `From How long will it take me? in a ${noun}’s journal.`}
      </p>
    </div>
  );
}

/**
 * The games hidden from Discover (#23), under a Discover heading: a row that opens their list, and
 * how many there are under it. In Settings since #27, which reverses #23's pick of the Discover
 * page alone; the reason then, *Your data* under a 900px fold, does not hold in a dialog, and the
 * user ticked it knowing that.
 *
 * Counted from the list the Discover page keeps, under the same key, so a hide made there is
 * counted here and a game shown again here leaves it. Nothing until the answer is in, as the
 * Sharing row's line waits, rather than a guess that would flip a moment later.
 */
function HiddenRow({ hobby, onOpen }: { hobby: Hobby; onOpen: () => void }) {
  const definition = hobbyDefinition(hobby);
  const { data: titles } = useQuery({
    queryKey: hiddenKey(hobby),
    queryFn: () => definition.discover!.hidden.list(),
  });
  const id = useId();

  return (
    <div role="group" aria-labelledby={id}>
      <p id={id} className={HEADING}>
        Discover
      </p>
      <button type="button" onClick={onOpen} aria-describedby={`${id}-count`} className={ROW}>
        <EyeOff className="size-3.5" />
        Hidden from Discover…
      </button>
      {titles !== undefined && (
        <p id={`${id}-count`} className={LINE}>
          {titles.length === 0
            ? 'Nothing hidden.'
            : `${titles.length} ${definition.titleNoun(titles.length)}, on no list until shown again.`}
        </p>
      )}
    </div>
  );
}

/**
 * #23's list of the games hidden from Discover, opened from Settings in Settings' place, as the
 * share dialog is: *Show again* on each, and closing it hands the keyboard back to the gear.
 */
function HiddenList({ hobby, onClose }: { hobby: Hobby; onClose: () => void }) {
  const hidden = hobbyDefinition(hobby).discover!.hidden;
  const queryClient = useQueryClient();
  const titles = useQuery({ queryKey: hiddenKey(hobby), queryFn: () => hidden.list() });
  const show = useMutation({
    mutationFn: (mediaId: number) => hidden.show(mediaId),
    onSuccess: (_nothing, mediaId) => forgetHidden(queryClient, hobby, mediaId),
  });

  return (
    <HiddenDialog
      titles={titles.data ?? []}
      onShow={(mediaId) => show.mutate(mediaId)}
      error={show.error}
      onClose={onClose}
    />
  );
}

interface ChoiceProps<T extends string> {
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/**
 * One setting with a few answers, on one line: its name, then the answers as a switch, #24's
 * Day | Year switch made larger. Every name on a 5rem column, so the switches start together.
 *
 * Radios, as the panel's rows were: a closed set where exactly one is current, which a screen
 * reader says as "Compact, selected, 2 of 2" in the group the name labels.
 */
function Choice<T extends string>({ name, value, options, onChange }: ChoiceProps<T>) {
  const id = useId();

  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 px-2 py-1">
      <span id={id} className="text-sm">
        {name}
      </span>
      <span
        role="radiogroup"
        aria-labelledby={id}
        className="inline-flex justify-self-start rounded border border-line p-0.5"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`h-6 rounded-sm px-1.5 text-xs whitespace-nowrap ${
              value === option.value ? 'bg-hover font-medium text-fg' : 'text-muted hover:text-fg'
            }`}
          >
            {option.label}
          </button>
        ))}
      </span>
    </div>
  );
}

interface BoxesProps {
  name: string;
  items: readonly { key: string; label: string; checked: boolean; onChange: (on: boolean) => void }[];
  note?: ReactNode;
}

/**
 * Settings that are each on or off, side by side under a heading: real checkboxes, tinted with
 * the accent, where the switches draw their own. Picked from screenshots for the Columns group,
 * where squares drawn to match the dots all but vanished on the dark themes; `color-scheme`, set
 * per theme in index.css, themes the box itself.
 */
function Boxes({ name, items, note }: BoxesProps) {
  const id = useId();

  return (
    <div>
      <p id={id} className={HEADING}>
        {name}
      </p>
      <div
        role="group"
        aria-labelledby={id}
        aria-describedby={note === undefined ? undefined : `${id}-note`}
        className="flex flex-wrap gap-x-2"
      >
        {items.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-hover"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(event) => item.onChange(event.target.checked)}
              className="accent-accent"
            />
            {item.label}
          </label>
        ))}
      </div>
      {note !== undefined && (
        <p id={`${id}-note`} className={LINE}>
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * A gear of eight teeth around a hole, at the palette's size and stroke: the prototype's drawing,
 * worked out once. Each tooth is four points, two on the rim and two at its tip.
 */
const GEAR = (() => {
  const teeth = 8;
  const step = (Math.PI * 2) / teeth;
  const at = (radius: number, angle: number) =>
    `${(8 + radius * Math.cos(angle)).toFixed(2)} ${(8 + radius * Math.sin(angle)).toFixed(2)}`;

  const points: string[] = [];
  for (let tooth = 0; tooth < teeth; tooth++) {
    const angle = tooth * step - Math.PI / 2;
    points.push(
      at(4.9, angle - 0.34 * step),
      at(6.6, angle - 0.18 * step),
      at(6.6, angle + 0.18 * step),
      at(4.9, angle + 0.34 * step),
    );
  }

  return `M${points.join(' L')} Z`;
})();

function Gear() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
    >
      <path d={GEAR} />
      <circle cx="8" cy="8" r="2.1" />
    </svg>
  );
}

function DownloadGlyph() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 2.5v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10" />
    </svg>
  );
}
