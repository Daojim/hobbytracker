import { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatJournalDate } from '../lib/time';

import { ratingTone } from '../lib/rating';
import { genreStripe, hobbyDefinition, otherColumns, resolveGenre } from '../hobbies';
import type { LibraryItem, LogStatus } from '../api/types';

/**
 * A stable handle on the button that opens a title's journal.
 *
 * The drawer has to hand focus back to it on the way out, and by then the card has usually been
 * remounted by a refetch — so the element captured at open time is a detached node. An id
 * survives that; a reference does not. Only the real card carries it: the drag preview renders
 * the title as plain text, so there is never a second element with the same id.
 */
export const cardTitleId = (mediaId: number) => `card-title-${mediaId}`;

/**
 * The same handle on the options corner, and it exists for the same reason.
 *
 * Escape has to hand the keyboard back to the control that opened the menu, and by then a
 * background refetch may have remounted the card underneath it. A ref captured on the way in
 * would be pointing at a detached node; an id finds whatever is there now.
 */
export const cardMenuId = (mediaId: number) => `card-menu-${mediaId}`;

/**
 * Removing a title, in the same three parts the drawer's deletes use.
 *
 * The `confirming` flag is passed in rather than held here because a refetch remounts cards —
 * the same fact that makes the drawer hand focus back by id rather than by a stored element —
 * and a confirm that quietly closes itself when a background refetch lands is one nobody can
 * trust. Holding it above the board also means only one card can be asking at a time.
 */
export interface CardRemoval {
  confirming: boolean;
  onAsk: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Whether this card's options are open, held above the board for `CardRemoval`'s reason exactly.
 *
 * The settings menu keeps its own open state and can: nothing remounts the header. Cards are
 * remounted by every refetch, and a menu that shut itself halfway through a choice because a
 * column refreshed would be a menu nobody could use. One card at a time falls out of holding it
 * there, which is what the board already does with the confirm.
 */
export interface CardMenu {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export interface CardFaceProps {
  item: LibraryItem;
  /** Moves the title to another column. Omitted by the drag preview. */
  onMove?: (mediaId: number, to: LogStatus) => void;
  /** Deleting the current pass. Omitted by the drag preview. */
  removal?: CardRemoval;
  /** The options corner and its panel. Omitted by the drag preview, which offers nothing. */
  menu?: CardMenu;
  /** Opens the journal for this title. Omitted by the drag preview for the same reason. */
  onOpen?: (mediaId: number) => void;
}

/** Everything a card shows. Shared with the drag preview, which must not be a second sortable. */
export function CardFace({ item, onMove, removal, menu, onOpen }: CardFaceProps) {
  const lastActivity = formatJournalDate(item.lastActivity);

  // What this hobby calls things, and what it paints its cards from. Taken off the row rather
  // than passed in: `hobby` is already on every board row, so a card can never be handed one
  // hobby's words about another hobby's title.
  const hobby = hobbyDefinition(item.hobby);

  // The chosen genre, or the one this title would be painted as. The stripe is decoration and
  // the name beside the rating is the information — eleven hues is past what colour alone can
  // carry, and a hobby whose palette has not been chosen yet paints nothing at all.
  const genre = resolveGenre(hobby.genres, item.genres, item.primaryGenre);
  const stripe = genreStripe(hobby.genres, genre);

  // Null twice over, and they mean different things: this hobby does not have progress, or it
  // does and this pass has not said where it is. The badge is absent for both.
  const progress = hobby.progress?.format(item.seasonNumber, item.episodeNumber) ?? null;

  /**
   * The title's other name, unless it is the same name.
   *
   * **Found by the e2e suite rather than reasoned about**, and it is not a stub artefact: MAL
   * genuinely answers `alternative_titles.en` of "Cowboy Bebop" for *Cowboy Bebop*, and does the
   * same for every title whose romaji reading is already English. Rendered blindly, those cards
   * print their own name twice.
   *
   * Compared case-insensitively and with the ends trimmed, because "the same name" is a thing a
   * reader judges rather than a byte comparison — and never any looser than that, since
   * `Frieren` and `Frieren: Beyond Journey's End` are genuinely two names.
   */
  const subtitle =
    item.subtitle !== null && item.subtitle.trim().toLowerCase() === item.title.trim().toLowerCase()
      ? null
      : item.subtitle;

  // The corner offers the same thing from every column now, which is the change. It used to be
  // a single × meaning *drop* on Playing and *remove* on Backlog, absent on the other two — so
  // which of the two endings a card offered was decided by where it sat rather than by you, and
  // a title in Completed had no control at all. Dropping is still not removing; both are simply
  // reachable from anywhere, alongside the three moves that used to need a drag.
  const confirming = removal !== undefined && removal.confirming;

  // A press anywhere else shuts the menu, which is the settings menu's mechanism exactly:
  // `pointerdown` rather than `click`, attached only while open, tested against a wrapper that
  // holds the corner as well as the panel. There is no other way to hear a press outside — and
  // unlike Escape there is no second listener to disagree with, since nothing else in the app
  // listens for one. It doubles as what closes the menu when a drag begins, because dnd-kit's
  // gesture starts with a pointerdown on some other card.
  const options = useRef<HTMLDivElement>(null);
  const menuOpen = menu?.open ?? false;
  const closeMenu = menu?.onClose;

  useEffect(() => {
    if (!menuOpen || closeMenu === undefined) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!options.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen, closeMenu]);

  // Both warnings name the title, which is what lets the confirm buttons stay two plain words:
  // anyone reading the card in order has just been told which one it means.
  //
  // The count is the whole of the second one. Removing takes every pass and everything written
  // during them, so a title carrying a completion and two replays is losing three records — and
  // "off your board" on its own reads like it is only losing a card. Deleting a single pass is
  // still possible; it is in the drawer, where the pass is named and dated.
  const warning = hobby.describeRemoval(item.title, item.entryCount);

  return (
    <>
      {/* Always rendered, transparent when there is nothing to paint: a stripe that vanished
          would shift an ungenred card's contents twelve pixels left of its neighbours' and make
          a mixed column look ragged. A child of CardFace rather than a class on CARD_CLASS, so
          the drag preview wears it too without a second call site knowing about genres. */}
      <span
        aria-hidden="true"
        data-genre-stripe=""
        className={`w-1 shrink-0 self-stretch rounded-full ${stripe ?? 'bg-transparent'}`}
      />

      {item.coverUrl === null ? (
        <span
          aria-hidden="true"
          data-cover=""
          className="flex aspect-[5/7] w-cover shrink-0 items-center justify-center rounded bg-sunken text-lg font-semibold text-muted"
        >
          {item.title.charAt(0)}
        </span>
      ) : (
        // Empty alt on purpose: the title is right there as text, so the cover repeats it.
        <img
          src={item.coverUrl}
          alt=""
          data-cover=""
          className="aspect-[5/7] w-cover shrink-0 rounded object-cover"
        />
      )}

      <div className="min-w-0 flex-1">
        {/* A heading, not a paragraph: each card names a thing, and it gives both test layers
            a way to read a column's contents in order without reaching for a test id.

            The title is the way into the journal, and it is a button so that works from the
            keyboard too. It pointedly does *not* stop the pointer the way the close corner
            does, and that is the whole difference between them: this is most of the card's
            surface, so a press here that could only ever be a click leaves the drag with just
            the margins to start from — which is what having to aim at a card felt like.

            Nothing is needed to keep the two gestures apart. The pointer sensor's 8px
            activation distance already decides it: under that the drag never begins and the
            click lands, and over it dnd-kit adds a capture-phase click listener of its own, so
            the press that moved a card cannot also open its drawer. */}
        <h3 className="text-card font-medium break-words">
          {onOpen === undefined ? (
            item.title
          ) : (
            <button
              type="button"
              id={cardTitleId(item.mediaId)}
              onClick={() => onOpen(item.mediaId)}
              className="text-left hover:underline"
            >
              {item.title}
            </button>
          )}
        </h3>

        {/* The title's other name, under it and quieter, for the one hobby whose titles have
            two. MAL states romaji as its own `title` — `Sousou no Frieren` — with the English
            one beside it, and both are worth finding by eye.

            Outside the <h3> rather than inside it, so a screen reader announces the heading as
            the title and this as a line of its own: an accessible name of "Sousou no Frieren
            Frieren: Beyond Journey's End" would be the one string nobody could search for.

            Absent rather than blank when there is nothing, which is the ordinary case — MAL
            leaves the English title off a great many entries, and every other hobby sends null
            always. A blank line would push the metadata row down on some cards and not
            others. */}
        {subtitle !== null && (
          <p data-subtitle="" className="text-xs break-words text-muted">
            {subtitle}
          </p>
        )}

        {/* The confirm takes the metadata row's place rather than sitting under it, so a card
            asking a question does not also resize the column it is in. */}
        {confirming ? (
          <span
            onPointerDown={(event) => event.stopPropagation()}
            className="mt-1 flex flex-wrap items-baseline gap-2 text-xs"
          >
            <span className="text-muted">{warning}</span>

            {/* Filled rather than red text, for ConfirmDelete's reason: on Ember the accent is
                red as well, and a destructive control must not be one hue away from a link. */}
            <button
              type="button"
              onClick={() => removal?.onConfirm()}
              className="rounded bg-danger px-2 py-0.5 font-semibold text-danger-fg"
            >
              Really remove?
            </button>

            <button
              type="button"
              onClick={() => removal?.onCancel()}
              className="rounded border border-line px-2 py-0.5 text-muted hover:bg-hover hover:text-fg"
            >
              Cancel
            </button>
          </span>
        ) : (
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
            {item.latestRating !== null && (
              <span
                role="img"
                aria-label={`Rated ${item.latestRating.toFixed(1)} out of 10`}
                className={`font-semibold ${ratingTone(item.latestRating)}`}
              >
                ★ {item.latestRating.toFixed(1)}
              </span>
            )}
            {item.entryCount > 1 && (
              <span role="img" aria-label={hobby.countPasses(item.entryCount)}>
                ×{item.entryCount}
              </span>
            )}
            {/* How long the title takes, named in full to a screen reader because the number
                alone is ambiguous: the drawer prints "31.5 h" for what a pass took *you*, and
                this is how long the thing takes anyone.

                One field, two readings. A game's is HowLongToBeat's headline figure — the one
                the site leads with, 42 hours for Hollow Knight where main story is 27 — written
                `~42 h`, with the tilde marking it as an estimate. A film's is an exact runtime,
                written `1 h 52 m` and unmarked, because marking it approximate would claim less
                than is known.

                It is also what `sort=length` orders on, and they cannot drift apart: both read
                `LibraryItem.lengthHours`, so there is nothing for them to disagree over. A
                column sorted shortest-first on a number the cards do not show reads as
                broken. */}
            {item.lengthHours !== null && (
              <span role="img" aria-label={hobby.describeLength(item.lengthHours)}>
                {hobby.formatLength(item.lengthHours)}
              </span>
            )}
            {/* Where you are in a show, and nothing at all on the two boards with no such
                idea. Gated on `hobby.progress` rather than on the values being non-null, which
                is the right way round: a game whose pass somehow carried a season still prints
                nothing, because a games card has no word for it. Inferring it from the nulls
                would put a badge on a board that cannot explain it.

                Beside the rating rather than under the title, because it is the same kind of
                thing as the rest of this row — a fact about the current pass. It is also the
                point of a TV board: a film is watched or it is not, and a show is a thing you
                are three seasons into. */}
            {progress !== null && (
              <span
                role="img"
                aria-label={hobby.progress!.describe(item.seasonNumber, item.episodeNumber)}
              >
                {progress}
              </span>
            )}
            {genre !== null && <span>{genre}</span>}
            {lastActivity !== null && <span>{lastActivity}</span>}
          </div>
        )}

        {/* The last thing you wrote, under everything else and quieter than it. Cut by CSS
            rather than by a character count, which is what lets it answer to the card's width
            and to the density setting — the server's cap sits far enough out that it is never
            what a reader sees cut. No date beside it: the row above already ends with one, and
            two dates on a card read as a contradiction rather than as two facts.

            Plain text with no role, unlike the badges above it. "★ 8.5" has to be spelled out
            for a screen reader because the glyph does not say what it means; a sentence you
            wrote yourself already reads as what it is. */}
        {item.latestNotePreview !== null && (
          <p data-note="" className="mt-1 line-clamp-2 text-xs break-words text-muted">
            {item.latestNotePreview}
          </p>
        )}
      </div>

      {menu !== undefined && !confirming && (
        <div
          ref={options}
          // Holds the corner and the panel together, so the press that opens the menu is inside
          // the region the outside-click listener tests against and does not close it again.
          //
          // Escape is caught here rather than at the document, unlike the settings menu. The
          // journal drawer already listens there, and the search bar records why a second
          // listener for one key is how two of them start disagreeing about which press was
          // meant for whom. Bubbling reaches this from the corner and from every item, which is
          // everywhere focus can be while the menu is open, so a container handler is enough.
          onKeyDown={(event) => {
            if (event.key === 'Escape' && menu.open) {
              menu.onClose();
              document.getElementById(cardMenuId(item.mediaId))?.focus();
            }
          }}
          className="relative"
        >
          <button
            type="button"
            id={cardMenuId(item.mediaId)}
            aria-label={`Options for ${item.title}`}
            aria-expanded={menu.open}
            // Without this the card's drag listeners see the press first. The pointer sensor's
            // activation distance already stops a click becoming a drag; this stops the press
            // being claimed at all. dnd-kit's keyboard sensor refuses to start from a nested
            // element on its own, so Space and Enter here need nothing.
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => (menu.open ? menu.onClose() : menu.onOpen())}
            className="h-5 w-5 shrink-0 rounded text-muted hover:bg-hover hover:text-fg"
          >
            ⋯
          </button>

          {menu.open && (
            <div
              // A group of buttons rather than role="menu". That role promises arrow-key roving
              // focus, and taking it without implementing the keyboard contract is worse than a
              // set of buttons that behaves exactly as it announces — which is what the settings
              // menu is too. The name is on the group, so the items can stay two or three words:
              // the e2e card() locator filters on a card's own text, and an item carrying a
              // title would make it match any card whose menu mentioned another card's game.
              role="group"
              aria-label={`Options for ${item.title}`}
              onPointerDown={(event) => event.stopPropagation()}
              className="absolute right-0 z-10 mt-1 flex w-44 flex-col rounded-lg border border-line bg-surface p-1 shadow-xl"
            >
              {/* The same drawer the title opens, and worth being here twice: the title is the
                  one gesture on a card that shares its surface with the drag, so an item that
                  cannot be mistaken for the start of one belongs beside the moves.

                  "Open journal" rather than a noun for the thing — every other hobby gets this
                  menu unmodified, and a journal is a journal whether it is about a game, a film
                  or an album. It is also what this drawer is called everywhere else here. */}
              {onOpen !== undefined && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      menu.onClose();
                      onOpen(item.mediaId);
                    }}
                    className="rounded px-2 py-1 text-left text-sm hover:bg-hover"
                  >
                    Open journal
                  </button>

                  <hr className="my-1 border-line-soft" />
                </>
              )}

              {otherColumns(item.hobby, item.currentStatus).map((column) => (
                <button
                  key={column.status}
                  type="button"
                  onClick={() => {
                    menu.onClose();
                    onMove?.(item.mediaId, column.status);
                  }}
                  className="rounded px-2 py-1 text-left text-sm hover:bg-hover"
                >
                  Move to {column.label}
                </button>
              ))}

              <hr className="my-1 border-line-soft" />

              {/* Asks rather than removes, and the menu gets out of the way so the question is
                  not put behind the thing that asked it. The confirm it opens is the one that was
                  already here: a delete is not one drag from undone, unlike everything above.

                  A translucent danger *fill* rather than danger text, which was the first
                  attempt and is the mistake this codebase has written down twice: Ember's
                  --danger is #ff8e7a and its --accent is #f2545b, so a red word here would sit
                  one hue from every link and current choice in the app and read as the
                  emphasised item rather than the dangerous one. A fill is a shape the accent
                  never wears — the rule the danger chip already follows — and it deepens under
                  the cursor so the thing that destroys something is the thing that reddens as
                  you reach for it. The label stays `text-fg` at both opacities, which is what
                  keeps this legible: `--fg` is proven on `--surface`, and a tint this light
                  moves the ground too little to spend that. */}
              <button
                type="button"
                onClick={() => {
                  menu.onClose();
                  removal?.onAsk();
                }}
                className="rounded bg-danger/10 px-2 py-1 text-left text-sm hover:bg-danger/25"
              >
                Remove from board
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * The card box, worn by the real card and by the drag preview alike.
 *
 * `items-start` is load-bearing rather than tidying. Without it the default `align-items:
 * stretch` wins over the cover's `aspect-[5/7]` — an aspect ratio only decides a height when
 * the height is free, and stretch takes it — so the cover rendered `w-cover` wide by however
 * tall the card happened to be, and `object-cover` cropped a vertical strip out of a portrait.
 * The narrower the column the more the title wrapped, the taller the card, the thinner the
 * cover. It measured 40×95 at 768px. The genre stripe still fills the height because it asks
 * for that itself with `self-stretch`.
 *
 * `@container` makes the card a query container so the cover and the title can size themselves
 * from `cqi` — see the density block in index.css. It belongs here rather than on the column
 * for the same reason the genre stripe lives inside CardFace: this class is what the drag
 * preview wears, and the preview is rendered outside every column, so a container on the
 * column would make a card shrink at the moment it was picked up. Safe against a layout cycle
 * because a card's width comes from its grid track and never from its contents.
 */
export const CARD_CLASS =
  '@container flex touch-none items-start gap-2 rounded-lg border border-card-line bg-surface p-card text-sm shadow-card';

export interface CardProps {
  item: LibraryItem;
  onMove: (mediaId: number, to: LogStatus) => void;
  removal: CardRemoval;
  menu: CardMenu;
  onOpen: (mediaId: number) => void;
  /** False outside `manual` sort, where a drag would imply a ranking the API will not store. */
  draggable: boolean;
}

export function Card({ item, onMove, removal, menu, onOpen, draggable }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.mediaId,
    // Read back by the drag handlers: a drop needs to know which column the card came from, and
    // the card's own status is the only record of that once it is airborne.
    data: { status: item.currentStatus },
    disabled: !draggable,
  });

  // dnd-kit's aria-disabled says "this sortable cannot be dragged", which is true and is not
  // what the attribute means here. It is the other half of the role it stamps — see below — and
  // on a listitem it is not a valid claim at all, while both a screen reader and Playwright
  // read it as disabling everything inside the card. Outside manual sort that would be the
  // title, which opens the journal, and the options corner, which is the whole point of this
  // change: a move through the menu is not a drag and never needed one to be on offer.
  //
  // What is actually on offer is proved by attempting a drag, in "sorting is a view" — an
  // attribute a person cannot see was standing in for the gesture and got it wrong.
  const { 'aria-disabled': _sortableDisabled, ...sortableAttributes } = attributes;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...sortableAttributes}
      {...listeners}
      // dnd-kit stamps role="button" so a sortable is announced as operable. Restored here
      // because the card contains a real button, and an interactive element inside another one
      // is ambiguous to a screen reader. The focusability the keyboard sensor needs comes from
      // its tabIndex, which survives.
      role="listitem"
      // Lifted while its menu is open, and it has to be. `@container` on CARD_CLASS implies
      // `contain: layout`, which makes every card a stacking context — so a panel hanging past
      // the bottom of one card is painted *under* the card after it, and under the cards of
      // whichever column sits below at two-across widths. Nothing clips it; it is only painted
      // behind. z-10 leaves the drawer's z-20 and the settings menu's z-30 above it, which is
      // the order those three want.
      className={`${CARD_CLASS} ${draggable ? 'cursor-grab active:cursor-grabbing' : ''} ${
        isDragging ? 'opacity-40' : ''
      } ${menu.open ? 'relative z-10' : ''}`}
    >
      <CardFace item={item} onMove={onMove} removal={removal} menu={menu} onOpen={onOpen} />
    </li>
  );
}
