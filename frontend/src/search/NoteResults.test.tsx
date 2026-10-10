import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NoteResults, noteResultId } from './NoteResults';
import { noteMatch } from '../test/notes';

const SILKSONG = { mediaId: 32, title: 'Hollow Knight: Silksong' };
const HOLLOW_KNIGHT = { mediaId: 4, title: 'Hollow Knight' };

/** Each title's card: its heading and the notes listed under it. */
const cards = () =>
  screen.getAllByRole('heading', { level: 3 }).map((heading) => {
    const card = heading.closest('li')!;
    return {
      title: heading.textContent,
      notes: within(card)
        .getAllByRole('button')
        .map((button) => button.id),
    };
  });

describe('NoteResults', () => {
  it('lists the notes under their titles, a title where its newest match is', () => {
    // The server sends them newest first and flat. Grouping keeps that order: Silksong comes
    // first because its newest match is the newest of all, and its older note joins it there
    // rather than appearing again below Hollow Knight.
    render(
      <NoteResults
        notes={[
          noteMatch({ id: 19, ...SILKSONG, writtenAt: '2026-10-06T01:40:00+00:00' }),
          noteMatch({ id: 26, ...HOLLOW_KNIGHT, writtenAt: '2026-07-04T16:00:00+00:00' }),
          noteMatch({ id: 11, ...SILKSONG, writtenAt: '2026-06-20T02:15:00+00:00' }),
        ]}
        more={false}
        words={['boss']}
        onOpen={vi.fn()}
      />,
    );

    expect(cards()).toEqual([
      { title: 'Hollow Knight: Silksong', notes: [noteResultId(19), noteResultId(11)] },
      { title: 'Hollow Knight', notes: [noteResultId(26)] },
    ]);
  });

  it('opens the journal of the note pressed, naming the title and the note', async () => {
    const onOpen = vi.fn();
    render(
      <NoteResults
        notes={[noteMatch({ id: 11, ...SILKSONG })]}
        more={false}
        words={['moss']}
        onOpen={onOpen}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /Moss Mother took twelve tries/ }));

    expect(onOpen).toHaveBeenCalledExactlyOnceWith(32, 11);
  });

  it('dates each note, and says it in the order a person reads it: when, then what', () => {
    // 02:15 UTC on the 20th is a quarter past ten the evening before, here.
    render(
      <NoteResults notes={[noteMatch({ id: 11 })]} more={false} words={['boss']} onOpen={vi.fn()} />,
    );

    expect(screen.getByRole('button')).toHaveAccessibleName(
      'Sep 19, 2026, 10:15 PM Moss Mother took twelve tries. First boss and already humbled.',
    );
  });

  it('marks the words searched for, in every note', () => {
    const { container } = render(
      <NoteResults
        notes={[
          noteMatch({ id: 19, body: 'Spent an hour on the boss above the town.' }),
          noteMatch({ id: 11, body: 'An hour and a half on the boss of the Marrow.' }),
        ]}
        more={false}
        words={['boss', 'hour']}
        onOpen={vi.fn()}
      />,
    );

    expect([...container.querySelectorAll('mark')].map((mark) => mark.textContent)).toEqual([
      'hour',
      'boss',
      'hour',
      'boss',
    ]);
  });

  it('shows a long note from shortly before its first match', () => {
    render(
      <NoteResults
        notes={[
          noteMatch({
            body: "Hearts of Stone done. O'Dimm is the best villain in the series, and the boss fight against the Caretaker took an hour.",
          }),
        ]}
        more={false}
        words={['boss']}
        onOpen={vi.fn()}
      />,
    );

    // From the date straight to the ellipsis: the note starts a word or two before the match.
    expect(screen.getByRole('button')).toHaveTextContent(
      /10:15 PM…best villain in the series, and the boss fight/,
    );
  });

  it("names an anime the way its card does, the English title over the romaji", () => {
    render(
      <NoteResults
        notes={[
          noteMatch({
            mediaId: 52991,
            title: "Frieren: Beyond Journey's End",
            subtitle: 'Sousou no Frieren',
          }),
        ]}
        more={false}
        words={['boss']}
        onOpen={vi.fn()}
      />,
    );

    const card = screen.getByRole('heading', { level: 3 }).closest('li')!;
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(
      "Frieren: Beyond Journey's End",
    );
    expect(card).toHaveTextContent('Sousou no Frieren');
  });

  it('says these are the most recent fifty, and how to narrow them, when there were more', () => {
    const { rerender } = render(
      <NoteResults notes={[noteMatch()]} more words={['boss']} onOpen={vi.fn()} />,
    );

    expect(screen.getByText('The 50 most recent. Another word narrows it.')).toBeInTheDocument();

    rerender(<NoteResults notes={[noteMatch()]} more={false} words={['boss']} onOpen={vi.fn()} />);

    expect(screen.queryByText(/most recent/)).not.toBeInTheDocument();
  });
});
