import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HowLong } from './HowLong';
import { setPace, setPlayStyle, type Pace } from '../lib/pace';
import { renderWithProviders } from '../test/render';
import type { HltbEstimates } from './fields';

/**
 * "How long will it take me?", the quiz picked at the workshop on 2 October 2026: a link under
 * the estimates that asks how much you play and how you will play it, then answers with a date.
 *
 * Today is pinned to 2 October 2026, noon here. Every date below is that plus a whole number of
 * days, counted from tomorrow.
 */
const TODAY = new Date('2026-10-02T16:00:00Z');

/** Hollow Knight's figures, as the e2e stub has them. */
const hollowKnight: HltbEstimates = {
  hltbAllStylesHours: 41.8,
  hltbMainStoryHours: 27,
  hltbMainExtraHours: 41.5,
  hltbCompletionistHours: 65,
};

function renderQuiz(played: number | null = 14, estimates = hollowKnight, initiallyOpen = false) {
  return renderWithProviders(
    <HowLong hobby="games" estimates={estimates} played={played} initiallyOpen={initiallyOpen} />,
  );
}

const ask = () => screen.getByRole('button', { name: 'How long will it take me?' });

/** What you said last time, as the quiz would have kept it. */
function remember(style = 'hltbMainStoryHours', pace: Pace = { hours: 2, per: 'day' }) {
  setPace('games', pace);
  setPlayStyle('games', style);
}

describe('HowLong', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(TODAY);
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is one line until it is asked', () => {
    // It costs the drawer a line at rest, which is what picking it over the options that are
    // always open bought.
    renderQuiz();

    expect(ask()).toBeInTheDocument();
    expect(screen.queryByText('How much do you play?')).not.toBeInTheDocument();
  });

  it('asks how much you play, then how you will play it, then answers with a date', async () => {
    renderQuiz();

    await userEvent.click(ask());
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '2 h a day' }));

    expect(screen.getByText('2 of 2')).toBeInTheDocument();
    expect(screen.getByText('How will you play it?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Just the story/ }));

    // 27 - 14 = 13 hours, at 2 a day: 6.5, so 7 days, counted from tomorrow.
    expect(screen.getByText(/you'd finish around/)).toHaveTextContent(
      "7 more days — you'd finish around Oct 9.",
    );
    expect(screen.getByText(/^At 2 h a day/)).toHaveTextContent(
      'At 2 h a day, just the story, from your 14 h · Change',
    );
  });

  it('remembers what you said, so the next game is one press to the answer', async () => {
    const first = renderQuiz();
    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: '2 h a day' }));
    await userEvent.click(screen.getByRole('button', { name: /^Just the story/ }));
    first.unmount();

    renderQuiz(31, {
      hltbAllStylesHours: 42,
      hltbMainStoryHours: 50,
      hltbMainExtraHours: 39,
      hltbCompletionistHours: 95,
    });
    await userEvent.click(ask());

    expect(screen.queryByText('How much do you play?')).not.toBeInTheDocument();
    // 50 - 31 = 19 hours at 2 a day: 9.5, so 10 days.
    expect(screen.getByText(/you'd finish around/)).toHaveTextContent(
      "10 more days — you'd finish around Oct 12.",
    );
  });

  it('opens already asked when the card asked for it', () => {
    renderQuiz(14, hollowKnight, true);

    expect(screen.getByText('How much do you play?')).toBeInTheDocument();
  });

  it('says you are past it rather than counting nought days', async () => {
    remember();
    renderQuiz(31, { ...hollowKnight, hltbMainStoryHours: 21 });

    await userEvent.click(ask());

    expect(screen.getByText(/against HowLongToBeat/)).toHaveTextContent(
      "You're past it. 31 h, against HowLongToBeat's 21 h for just the story.",
    );
  });

  it('counts a game not begun from the start, and does not say more', async () => {
    remember();
    renderQuiz(null, { ...hollowKnight, hltbMainStoryHours: 8 });

    await userEvent.click(ask());

    expect(screen.getByText(/you'd finish around/)).toHaveTextContent(
      "4 days — you'd finish around Oct 6.",
    );
    expect(screen.getByText(/^At 2 h a day/)).toHaveTextContent(
      'At 2 h a day, just the story, from the start · Change',
    );
  });

  it('answers a pace given in hours a week', async () => {
    remember('hltbMainStoryHours', { hours: 10, per: 'week' });
    renderQuiz();

    await userEvent.click(ask());

    // 13 hours at 10 a week is 9.1 days of it, so 10.
    expect(screen.getByText(/you'd finish around/)).toHaveTextContent(
      "10 more days — you'd finish around Oct 12.",
    );
  });

  it('says the year of a finish in another one, and a long way off in months', async () => {
    remember('hltbCompletionistHours', { hours: 0.5, per: 'day' });
    renderQuiz();

    await userEvent.click(ask());

    // 65 - 14 = 51 hours at half an hour a day: 102 days.
    expect(screen.getByText(/you'd finish around/)).toHaveTextContent(
      "About 3 more months — you'd finish around Jan 12, 2027.",
    );
  });

  it('offers only the ways to play that this game has a figure for', async () => {
    remember('hltbCompletionistHours');
    renderQuiz(14, { ...hollowKnight, hltbCompletionistHours: null });

    await userEvent.click(ask());

    // Everything was what you said last time, and this game has no time for it, so it asks the
    // one question it cannot answer for you rather than guessing another style.
    expect(screen.queryByText('How much do you play?')).not.toBeInTheDocument();
    expect(screen.getByText('How will you play it?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Everything/ })).not.toBeInTheDocument();
    // The words and the figure, as one name. Its spacing is the browser's to decide, not this
    // harness's — jsdom puts a space between child elements whatever the markup says — so
    // how-long.spec.ts is what clicks the button by this name in Chromium.
    expect(
      screen.getByRole('button', { name: 'Just the story Main story · 27 h' }),
    ).toBeInTheDocument();
  });

  it('takes a pace of your own', async () => {
    renderQuiz();

    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: 'Other…' }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Hours you play' }), '9');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'A day or a week' }), 'week');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await userEvent.click(screen.getByRole('button', { name: /^Just the story/ }));

    // 13 hours at 9 a week: 10.1 days, so 11.
    expect(screen.getByText(/you'd finish around/)).toHaveTextContent(
      "11 more days — you'd finish around Oct 13.",
    );
    expect(screen.getByText(/^At 9 h a week/)).toBeInTheDocument();
  });

  it('takes Enter in a pace of your own as Next', async () => {
    renderQuiz();

    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: 'Other…' }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Hours you play' }), '3{Enter}');

    expect(screen.getByText('How will you play it?')).toBeInTheDocument();
  });

  it('refuses a pace that cannot be one, and stays on the question', async () => {
    renderQuiz();

    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: 'Other…' }));
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Hours you play' }), '30');
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'More than 0 and at most 24 hours a day, with at most two decimal places.',
    );
    expect(screen.getByText('How much do you play?')).toBeInTheDocument();
  });

  it('asks both again when you change your answers', async () => {
    remember();
    renderQuiz();

    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: 'Change' }));

    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    expect(screen.getByText('How much do you play?')).toBeInTheDocument();
  });

  it('says how much a day it takes to finish by a date', async () => {
    remember();
    renderQuiz();

    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: 'Finish by a date instead' }));
    await userEvent.type(screen.getByLabelText('Finish by'), '2026-11-15');

    // 13 hours over the 44 days to 15 November: 0.3 of an hour a day.
    expect(screen.getByText(/play about/)).toHaveTextContent('play about 18 min a day.');
    expect(screen.getByText(/^Just the story/)).toHaveTextContent(
      'Just the story, from your 14 h · Change',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Use my pace instead' }));
    expect(screen.getByText(/you'd finish around/)).toBeInTheDocument();
  });

  it('asks for a date after today rather than dividing by nothing', async () => {
    remember();
    renderQuiz();

    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: 'Finish by a date instead' }));
    await userEvent.type(screen.getByLabelText('Finish by'), '2026-10-02');

    expect(screen.getByText('Pick a date after today.')).toBeInTheDocument();
  });

  it('keeps the keyboard in the question as it moves from one step to the next', async () => {
    // Each answer takes the button that gave it off the screen. Left there, focus falls to the
    // page behind the drawer, and the next Tab walks the board rather than the question.
    renderQuiz();

    await userEvent.click(ask());
    const question = screen.getByRole('group', { name: 'How long will it take me?' });
    expect(question).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: '2 h a day' }));
    expect(question).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(ask()).toHaveFocus();
  });

  it('folds back to one line when hidden', async () => {
    remember();
    renderQuiz();

    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));

    expect(ask()).toBeInTheDocument();
    expect(screen.queryByText(/you'd finish around/)).not.toBeInTheDocument();
  });

  it('still answers when storage will not keep what you said', async () => {
    // On the instance: a spy on Storage.prototype refuses nothing in this harness.
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const first = renderQuiz();
    await userEvent.click(ask());
    await userEvent.click(screen.getByRole('button', { name: '2 h a day' }));
    await userEvent.click(screen.getByRole('button', { name: /^Just the story/ }));
    expect(screen.getByText(/you'd finish around/)).toBeInTheDocument();
    first.unmount();

    // And for the rest of the page's life, as a column taken off in Settings is.
    renderQuiz();
    await userEvent.click(ask());
    expect(screen.getByText(/you'd finish around/)).toBeInTheDocument();

    // Storage working again clears the page's copy, which would otherwise outlive this test.
    vi.restoreAllMocks();
    setPace('games', { hours: 2, per: 'day' });
  });
});
