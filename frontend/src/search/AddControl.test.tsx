import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddControl } from './AddControl';
import { placePanel } from './WhenFinished';
import { GAMES } from '../hobbies/games';
import { MOVIES } from '../hobbies/movies';
import { addColumns, columnsFor, type HobbyDefinition, type SearchHit } from '../hobbies';
import { HOURS_RULE } from '../journal/fields';
import { thisYearHere, yearRule } from '../lib/passDate';

const hit = (overrides: Partial<SearchHit> = {}): SearchHit => ({
  id: 3003,
  title: 'Hollow Knight',
  coverUrl: null,
  byline: [],
  release: null,
  ...overrides,
});

/** A tile's add on a board with nothing taken off, inside something that scrolls, as the strip does. */
function renderControl(definition: HobbyDefinition = GAMES, title = 'Hollow Knight') {
  const onAdd = vi.fn();
  const view = render(
    <div data-testid="strip">
      <AddControl
        hit={hit({ title })}
        definition={definition}
        columns={addColumns(columnsFor(definition.slug))}
        adding={false}
        onAdd={onAdd}
      />
    </div>,
  );
  return { onAdd, ...view };
}

const check = (name = 'Add Hollow Knight to completed') => screen.getByRole('button', { name });
const question = () => screen.queryByRole('dialog');
const inQuestion = () => within(screen.getByRole('dialog'));
const yearBox = () =>
  inQuestion().getByRole<HTMLInputElement>('textbox', { name: 'Year finished' });
const hoursBox = () => inQuestion().getByRole('textbox', { name: 'Hours played' });
const answer = (name: 'Add' | 'Today' | "I don't remember") =>
  userEvent.click(inQuestion().getByRole('button', { name }));

const THIS_YEAR = thisYearHere();

describe('the ✓ on a tile', () => {
  it('asks when the title was finished rather than adding it', async () => {
    // Today's stamp is right for a game finished this evening and wrong for one finished in
    // 2019, and only the person adding knows which this is — round one's pick at the #24
    // workshop, asked before anything is added.
    const { onAdd } = renderControl();

    await userEvent.click(check());

    expect(screen.getByRole('dialog', { name: 'When did you finish it?' })).toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('says that it asks, where + and ▶ add', async () => {
    renderControl();

    expect(check()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: 'Add Hollow Knight to backlog' })).not.toHaveAttribute(
      'aria-expanded',
    );
    expect(screen.getByRole('button', { name: 'Add Hollow Knight to playing' })).not.toHaveAttribute(
      'aria-expanded',
    );

    await userEvent.click(check());

    expect(check()).toHaveAttribute('aria-expanded', 'true');
  });

  it('puts the keyboard in the year box', async () => {
    renderControl();

    await userEvent.click(check());

    expect(yearBox()).toHaveFocus();
  });

  it("asks in round three's words: In, Hours played, then Add, or, Today and I don't remember", async () => {
    renderControl();

    await userEvent.click(check());

    const asked = inQuestion();
    expect(asked.getByText('When did you finish it?')).toBeInTheDocument();
    expect(asked.getByText('In')).toBeInTheDocument();
    expect(asked.getByText('Hours played')).toBeInTheDocument();
    expect(asked.getByText('or')).toBeInTheDocument();
    expect(yearBox()).toHaveAttribute('placeholder', 'Year');
    expect(hoursBox()).toHaveAttribute('placeholder', 'optional');
    expect(
      asked.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent),
    ).toEqual(['Cancel', 'Add', 'Today', "I don't remember"]);
  });

  it("asks a film when it was watched, and offers no hours where a pass keeps none", async () => {
    // The verb is the hobby's, from hobbies/, never a branch on the slug; the hours box is there
    // where PassFields.hoursPlayed is, which is games.
    renderControl(MOVIES, 'Arrival');

    await userEvent.click(check('Add Arrival to watched'));

    expect(screen.getByRole('dialog', { name: 'When did you watch it?' })).toBeInTheDocument();
    expect(inQuestion().queryByRole('textbox', { name: 'Hours played' })).not.toBeInTheDocument();
    expect(yearBox()).toBeInTheDocument();
  });

  it('adds the title finished in the year in the box', async () => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    await answer('Add');

    expect(onAdd.mock.calls).toEqual([[3003, 'Completed', { completedYear: 2019 }]]);
    expect(question()).not.toBeInTheDocument();
  });

  it.each([
    ['the year box', () => yearBox()],
    ['the hours box', () => hoursBox()],
  ])('adds in the year at Enter in %s', async (_, box) => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    await userEvent.type(box(), '{Enter}');

    expect(onAdd.mock.calls).toEqual([[3003, 'Completed', { completedYear: 2019 }]]);
  });

  it('adds nothing at an Enter that ends what an input method was writing', async () => {
    // A Japanese keyboard writes through an input method, whose Enter commits the characters it
    // was composing. That Enter is the input method's, as it is in the note box.
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    fireEvent.keyDown(yearBox(), { key: 'Enter', isComposing: true });

    expect(onAdd).not.toHaveBeenCalled();
    expect(question()).toBeInTheDocument();
  });

  it('adds it finished today at Today, naming no finish, as the ✓ always did', async () => {
    // Today is the drag's own rule, which the server applies to an add that names nothing.
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await answer('Today');

    expect(onAdd.mock.calls).toEqual([[3003, 'Completed', {}]]);
  });

  it("adds it finished with no date at I don't remember", async () => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await answer("I don't remember");

    expect(onAdd.mock.calls).toEqual([[3003, 'Completed', { undated: true }]]);
  });

  it.each([
    ['Add', { completedYear: 2019, hoursPlayed: 40.5 }],
    ['Today', { hoursPlayed: 40.5 }],
    ["I don't remember", { undated: true, hoursPlayed: 40.5 }],
  ] as const)('sends the hours with %s', async (name, finish) => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    await userEvent.type(hoursBox(), '40.5');
    await answer(name);

    expect(onAdd.mock.calls).toEqual([[3003, 'Completed', finish]]);
  });

  it('says what a year is when Add finds the box empty, and adds nothing', async () => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await answer('Add');

    expect(inQuestion().getByRole('alert')).toHaveTextContent(yearRule(THIS_YEAR));
    expect(onAdd).not.toHaveBeenCalled();
    expect(question()).toBeInTheDocument();
  });

  it.each(['19', 'abcd', '2o19', '1899', String(THIS_YEAR + 1)])(
    'says the same of %s',
    async (typed) => {
      // One line for every case, the user's pick at the #24 build, ending at this year here.
      const { onAdd } = renderControl();

      await userEvent.click(check());
      await userEvent.type(yearBox(), typed);
      await answer('Add');

      expect(inQuestion().getByRole('alert')).toHaveTextContent(`A year from 1900 to ${THIS_YEAR}.`);
      expect(onAdd).not.toHaveBeenCalled();
    },
  );

  it.each(['Today', "I don't remember"] as const)(
    'takes %s whatever the year box holds, since that answer names no year',
    async (name) => {
      const { onAdd } = renderControl();

      await userEvent.click(check());
      await userEvent.type(yearBox(), 'abcd');
      await answer(name);

      expect(onAdd).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it.each(['Add', 'Today', "I don't remember"] as const)(
    "refuses hours it cannot take at %s, in the journal's words",
    async (name) => {
      const { onAdd } = renderControl();

      await userEvent.click(check());
      await userEvent.type(yearBox(), '2019');
      await userEvent.type(hoursBox(), '0');
      await answer(name);

      expect(inQuestion().getByRole('alert')).toHaveTextContent(HOURS_RULE);
      expect(onAdd).not.toHaveBeenCalled();
    },
  );

  it('says both refusals at once, the year first', async () => {
    renderControl();

    await userEvent.click(check());
    await userEvent.type(hoursBox(), '1000');
    await answer('Add');

    expect(inQuestion().getAllByRole('alert').map((line) => line.textContent)).toEqual([
      yearRule(THIS_YEAR),
      HOURS_RULE,
    ]);
  });

  it('takes a refusal back once its box is written in again', async () => {
    renderControl();

    await userEvent.click(check());
    await answer('Add');
    await userEvent.type(yearBox(), '2');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('closes at Escape and gives the keyboard back to the ✓', async () => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.keyboard('{Escape}');

    expect(question()).not.toBeInTheDocument();
    expect(check()).toHaveFocus();
    expect(check()).toHaveAttribute('aria-expanded', 'false');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('closes at its ×, giving the keyboard back to the ✓', async () => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.click(inQuestion().getByRole('button', { name: 'Cancel' }));

    expect(question()).not.toBeInTheDocument();
    expect(check()).toHaveFocus();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('closes at a press anywhere else, as the card menu does', async () => {
    renderControl();

    await userEvent.click(check());
    await userEvent.click(document.body);

    expect(question()).not.toBeInTheDocument();
  });

  it('closes at a press on another column of the add, which then adds', async () => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.click(screen.getByRole('button', { name: 'Add Hollow Knight to playing' }));

    expect(question()).not.toBeInTheDocument();
    expect(onAdd.mock.calls).toEqual([[3003, 'InProgress']]);
  });

  it('stays open at a press inside it', async () => {
    renderControl();

    await userEvent.click(check());
    await userEvent.click(screen.getByText('When did you finish it?'));

    expect(question()).toBeInTheDocument();
  });

  it('closes at a second press of the ✓, adding nothing', async () => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.click(check());

    expect(question()).not.toBeInTheDocument();
    expect(check()).toHaveAttribute('aria-expanded', 'false');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('keeps Tab going round inside it', async () => {
    // It is in a portal at the end of the page, so the strip cannot cut it off, and Tab past
    // either end would walk the page from its bottom. The user's pick at the #24 build: round,
    // as the share dialog's does.
    renderControl();

    await userEvent.click(check());
    const named = (name: string) => inQuestion().getByRole('button', { name });

    await userEvent.tab();
    expect(hoursBox()).toHaveFocus();
    await userEvent.tab();
    expect(named('Add')).toHaveFocus();
    await userEvent.tab();
    expect(named('Today')).toHaveFocus();
    await userEvent.tab();
    expect(named("I don't remember")).toHaveFocus();
    await userEvent.tab();
    expect(named('Cancel')).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(named("I don't remember")).toHaveFocus();
  });
});

describe('the year the ✓ remembers', () => {
  it('is the last year added on this board, already in the box and selected', async () => {
    // Filling a board backwards is many games in one sitting, often of one year: round one's pick,
    // with round two's look — in the box, so Enter adds the next game in it.
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    await answer('Add');
    await userEvent.click(check());

    expect(yearBox()).toHaveValue('2019');
    expect(yearBox()).toHaveFocus();
    expect([yearBox().selectionStart, yearBox().selectionEnd]).toEqual([0, 4]);

    await userEvent.keyboard('{Enter}');

    expect(onAdd.mock.calls).toEqual([
      [3003, 'Completed', { completedYear: 2019 }],
      [3003, 'Completed', { completedYear: 2019 }],
    ]);
  });

  it('gives way to a year typed over it', async () => {
    const { onAdd } = renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    await answer('Add');
    await userEvent.click(check());
    await userEvent.keyboard('2021{Enter}');

    expect(onAdd.mock.lastCall).toEqual([3003, 'Completed', { completedYear: 2021 }]);
  });

  it('is never a year typed and not added', async () => {
    // A press away closes the panel with what was typed in it: the box offers the last year
    // added, the user's pick at the #24 build.
    renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2018');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(check());

    expect(yearBox()).toHaveValue('');
  });

  it('is never a year the rule refused', async () => {
    renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), String(THIS_YEAR + 1));
    await answer('Add');
    await userEvent.keyboard('{Escape}');
    await userEvent.click(check());

    expect(yearBox()).toHaveValue('');
  });

  it.each(['Today', "I don't remember"] as const)('stays what it was after %s', async (name) => {
    renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    await answer('Add');
    await userEvent.click(check());
    await answer(name);
    await userEvent.click(check());

    expect(yearBox()).toHaveValue('2019');
  });

  it("is this board's, so another board's box starts empty", async () => {
    // Per board, the user's pick at the #24 build: a year of games is not a year of films.
    const games = renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    await answer('Add');
    games.unmount();

    renderControl(MOVIES, 'Arrival');
    await userEvent.click(check('Add Arrival to watched'));

    expect(yearBox()).toHaveValue('');
  });

  it('lasts for the visit and no longer, so nothing of it is stored', async () => {
    // Round one's pick over keeping it per board and per browser: the next visit starts empty.
    renderControl();

    await userEvent.click(check());
    await userEvent.type(yearBox(), '2019');
    await answer('Add');

    expect(localStorage.length).toBe(0);
  });
});

describe('placePanel', () => {
  // Round two's measures: a panel 288px wide and 156px tall over a control 28px tall.
  const panel = { width: 288, height: 156 };
  const control = { top: 500, right: 700, bottom: 528 };

  it("sits 6px above the control, its right edge on the ✓'s", () => {
    expect(placePanel(control, panel, 1440)).toEqual({ top: 338, left: 412 });
  });

  it('is held 8px inside the window on the left', () => {
    expect(placePanel({ ...control, right: 150 }, panel, 1440).left).toBe(8);
  });

  it('is held 8px inside the window on the right', () => {
    expect(placePanel({ ...control, right: 1439 }, panel, 1440).left).toBe(1144);
  });

  it('stays above while there is 8px to spare over it', () => {
    expect(placePanel({ ...control, top: 170, bottom: 198 }, panel, 1440).top).toBe(8);
  });

  it('opens 6px below the control when above would leave less, the user’s pick at the #24 build', () => {
    expect(placePanel({ ...control, top: 169, bottom: 197 }, panel, 1440).top).toBe(203);
  });
});

describe('the ✓’s question, on the page', () => {
  // Where the control is, which jsdom cannot lay out: the panel is measured from the control's
  // box and its own, and is given the window's. Moved by a test to stand for a scroll.
  let at = { top: 500, right: 700 };

  beforeEach(() => {
    at = { top: 500, right: 700 };
    // The window's width less its scrollbar, which jsdom gives as nought.
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1440);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      const box = (left: number, top: number, width: number, height: number) =>
        ({
          left,
          top,
          width,
          height,
          right: left + width,
          bottom: top + height,
          x: left,
          y: top,
          toJSON: () => ({}),
        }) as DOMRect;

      if (this.getAttribute('role') === 'dialog') {
        return box(0, 0, 288, 156);
      }
      if (this.querySelector(':scope > [aria-expanded]') !== null) {
        return box(at.right - 144, at.top, 144, 28);
      }
      return box(0, 0, 0, 0);
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it("opens over the tile, its right edge on the ✓'s", async () => {
    renderControl();

    await userEvent.click(check());

    expect(screen.getByRole('dialog')).toHaveStyle({ position: 'fixed', top: '338px', left: '412px' });
  });

  it('opens below the control when there is no room above it', async () => {
    at = { top: 100, right: 700 };
    renderControl();

    await userEvent.click(check());

    expect(screen.getByRole('dialog')).toHaveStyle({ top: '134px' });
  });

  it('follows its ✓ when the strip or the page scrolls', async () => {
    // The user's pick at the #24 build. A phone scrolls the page itself to lift the focused year
    // box above its keyboard, so the panel and its tile have to move together.
    renderControl();

    await userEvent.click(check());
    at = { top: 300, right: 500 };
    fireEvent.scroll(screen.getByTestId('strip'));

    expect(screen.getByRole('dialog')).toHaveStyle({ top: '138px', left: '212px' });
  });

  it('follows it when the window changes size', async () => {
    renderControl();

    await userEvent.click(check());
    at = { top: 500, right: 650 };
    fireEvent(window, new Event('resize'));

    expect(screen.getByRole('dialog')).toHaveStyle({ top: '338px', left: '362px' });
  });
});
