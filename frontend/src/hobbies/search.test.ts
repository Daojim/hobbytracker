import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { hobbyDefinition } from './index';
import { server } from '../test/server';
import { anime } from '../test/anime';

/**
 * The half of a hobby the search strip reads — `journal.test.ts`'s sibling.
 *
 * Worth its own file for one hobby's sake. Three of the four map a provider's search response
 * onto a tile with nothing to decide: a title is a title. Anime has two names for the same
 * thing, so which one leads is a choice, and getting it wrong is silent — the tile renders
 * either way.
 */
describe('search.run, on an anime', () => {
  it('leads a result with the English title and puts the romaji one under it', async () => {
    // The English name is what a person here calls the thing, so it is the line they read
    // first. `media.title` still holds the romaji, because that is what MAL matched on — this
    // is a decision about the reading order and not about what is stored.
    server.use(http.get('/api/anime', () => HttpResponse.json([anime()])));

    expect(await hobbyDefinition('anime').search.run('frieren')).toEqual([
      {
        id: 52991,
        title: "Frieren: Beyond Journey's End",
        coverUrl: null,
        byline: ['Sousou no Frieren', 'Fall 2023'],
        release: null,
      },
    ]);
  });

  it('leads with the romaji title where MAL has no English one', async () => {
    // The ordinary case rather than a gap: MAL leaves `en` absent on a great many entries. The
    // one name it does have leads, and the byline's first line is empty — which the tile drops
    // rather than printing as a blank row.
    server.use(
      http.get('/api/anime', () =>
        HttpResponse.json([anime({ title: 'Ping Pong the Animation', englishTitle: null })]),
      ),
    );

    expect((await hobbyDefinition('anime').search.run('ping pong'))[0]).toMatchObject({
      title: 'Ping Pong the Animation',
      byline: ['', 'Fall 2023'],
    });
  });

  it('drops a second title that is only the first one again', async () => {
    // MAL answers `alternative_titles.en` of "Cowboy Bebop" for Cowboy Bebop, and does the same
    // for every title whose romaji reading is already English. The card has refused that pair
    // since the hobby shipped; the search tile printed it twice, and this is the same rule
    // reaching the other place two names are shown.
    server.use(
      http.get('/api/anime', () =>
        HttpResponse.json([
          anime({ title: 'Cowboy Bebop', englishTitle: 'Cowboy Bebop' }),
          // Case and surrounding space are not a difference a reader would call one — and
          // nothing looser than that, because Frieren and Frieren: Beyond Journey's End are
          // genuinely two names. The card's own rule, stated once more where it is needed.
          anime({ id: 2, title: 'Cowboy Bebop', englishTitle: '  cowboy bebop ' }),
        ]),
      ),
    );

    const [exact, cased] = await hobbyDefinition('anime').search.run('bebop');

    expect(exact).toMatchObject({ title: 'Cowboy Bebop', byline: ['', 'Fall 2023'] });
    expect(cased?.byline[0]).toBe('');
  });
});
