import { describe, expect, it } from 'vitest';
import { finishQuestion, putBackAnswer, REPLAY_ANSWER } from './finishQuestion';

describe('finishQuestion', () => {
  it('asks about the day the pass was finished', () => {
    // 3:14 in the morning in New York, the mistaken finish #14 was found from.
    expect(finishQuestion('2026-10-08T07:14:00+00:00', null)).toBe(
      'Did you finish it on Oct 8, 2026?',
    );
  });

  it('names the day here rather than in UTC', () => {
    // 11pm in New York on the 7th is already the 8th in UTC. A finish is an instant, so it goes
    // through the journal zone as every other instant does.
    expect(finishQuestion('2026-10-08T03:00:00+00:00', null)).toBe(
      'Did you finish it on Oct 7, 2026?',
    );
  });

  it('asks about a finish kept as a year in its year, where a day takes "on"', () => {
    // #24, round three: a year takes "in" where a day takes "on", on a card and in the journal.
    expect(finishQuestion(null, 2019)).toBe('Did you finish it in 2019?');
  });

  it('asks without a day when the pass has no finish', () => {
    // A finished pass can have its finish date cleared by hand. A start never stands in for it.
    expect(finishQuestion(null, null)).toBe('Did you finish it?');
  });

  it('says what each answer does', () => {
    expect(REPLAY_ANSWER).toBe('Yes — start a new pass');
    expect(putBackAnswer('Watching')).toBe('No — move it to Watching');
  });
});
