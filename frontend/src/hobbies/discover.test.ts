import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { HOBBIES } from '../shell/hobbies';
import { hobbyDefinition } from './index';
import { server } from '../test/server';
import { game } from '../test/games';

/**
 * The half of a hobby the Discover page reads — `search.test.ts`'s sibling.
 *
 * The page itself knows no hobby: which lists there are, what each is called and where each is
 * asked for all come from here. So a slug that drifted from the API's would be a tab that loads
 * nothing, found only by clicking it.
 */
describe('discover, on games', () => {
  it('names four lists in tab order, each with its own address', () => {
    // The API's own slugs, which is what makes each one a place: a tab is a link to
    // /board/games/discover/<slug>, and GET /api/games/discover/<slug> answers it.
    expect(hobbyDefinition('games').discover?.lists.map((list) => list.slug)).toEqual([
      'new-releases',
      'popular-now',
      'most-anticipated',
      'most-played',
    ]);
  });

  it('asks the API for each list by its address', async () => {
    const asked: string[] = [];
    server.use(
      http.get('/api/games/discover/:list', ({ params }) => {
        asked.push(String(params.list));
        return HttpResponse.json({ titles: [], next: null });
      }),
    );

    for (const list of hobbyDefinition('games').discover!.lists) {
      await list.run(0);
    }

    expect(asked).toEqual(['new-releases', 'popular-now', 'most-anticipated', 'most-played']);
  });

  it('asks for a page from the place it is given, and passes on where the next one starts', async () => {
    // The server decides where a page starts. This side sends back what it was told and works
    // nothing out for itself, so a `next` of 53 is asked for as 53 — not as page two.
    const asked: (string | null)[] = [];
    server.use(
      http.get('/api/games/discover/:list', ({ request }) => {
        asked.push(new URL(request.url).searchParams.get('from'));
        return HttpResponse.json({ titles: [game({ id: 9 })], next: 101 });
      }),
    );

    const [list] = hobbyDefinition('games').discover!.lists;
    const page = await list!.run(53);

    expect(asked).toEqual(['53']);
    expect(page.next).toBe(101);
    expect(page.titles.map((hit) => hit.id)).toEqual([9]);
  });

  it('reads a title the way the search strip does, release date and all', async () => {
    // One mapping for a game however it was found. A tile on the wall and a tile in the strip
    // have to agree about whether a title is out — that decides whether the button says Add or
    // Add to calendar — and the server's answer is passed through rather than decided again.
    const upcoming = game({
      id: 7,
      title: 'Silksong II',
      released: false,
      releaseDate: '2027-03-12',
      releasePrecision: 'Day',
    });

    server.use(
      http.get('/api/games/discover/:list', () =>
        HttpResponse.json({ titles: [upcoming], next: null }),
      ),
      http.get('/api/games', () => HttpResponse.json([upcoming])),
    );

    const [list] = hobbyDefinition('games').discover!.lists;
    const fromTheWall = (await list!.run(0)).titles;

    expect(fromTheWall).toEqual(await hobbyDefinition('games').search.run('silksong'));
    expect(fromTheWall).toEqual([
      {
        id: 7,
        title: 'Silksong II',
        coverUrl: null,
        byline: ['PC, Switch', 'Team Cherry'],
        release: { released: false, day: '2027-03-12', precision: 'Day' },
      },
    ]);
  });

  it('says what the page is called and how an empty search box offers it', () => {
    const discover = hobbyDefinition('games').discover!;

    expect(discover.heading).toBe('Discover games');
    expect(discover.invitation).toEqual({ prompt: 'Not sure what to add?', link: 'Browse popular games' });
    expect(discover.lists.map((list) => list.label)).toEqual([
      'New releases',
      'Popular now',
      'Most anticipated',
      'Most played',
    ]);
  });
});

describe('discover, on every other hobby', () => {
  it('is stated as absent rather than left out', () => {
    // The `releases` precedent. TMDB and MAL both have lists of what is popular, and nothing
    // asks them yet — so this is a fact about providers, and turning a hobby on is one block
    // here plus the provider's method. Stated, so a hobby that forgot it fails to compile.
    const others = HOBBIES.filter((hobby) => hobby.ready && hobby.slug !== 'games');

    expect(others.length).toBeGreaterThan(0);
    for (const { slug } of others) {
      expect(hobbyDefinition(slug).discover).toBeNull();
    }
  });
});
