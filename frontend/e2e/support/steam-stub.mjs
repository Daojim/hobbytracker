/**
 * A stand-in for Steam's Web API, serving the one route the app calls:
 * `IUserReviewsService/GetAppReviews`, the keyless replacement for the deprecated `appreviews`.
 *
 * `Steam:BaseUrl` is a plain option, so pointing it here makes "never reach Steam" true with no
 * production code involved, as the TMDB and MAL stubs do for theirs.
 *
 * **The question is parsed, not recognised.** It travels as JSON in `input_json`, and a question
 * that does not parse, or names no app, is refused with a 400 as Steam refuses one.
 *
 * **A question naming a language is answered in every language**, with other numbers and, for
 * Hollow Knight, another word: Steam's default is the line its store page shows an English reader,
 * and every language named a different verdict from the page for 8 of the user's games. So a client
 * that starts asking for every language turns the journal spec red rather than passing it.
 *
 * **An app Steam does not know is a 200 with an empty `response`**, which is what Steam answers —
 * measured on 12 November 2026 — and what the client has to read as no verdict rather than a failure.
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.STEAM_STUB_PORT ?? 5394);

/**
 * Per app, what Steam says by default (English, the store page's line) and in every language.
 * The apps are the IGDB stub's: see its `steam` fields.
 */
const APPS = {
  // Hollow Knight. The words and counts are Armored Core VI's from the workshop's renders, so the
  // journal's rows are as wide as the picked shots' and the layout spec measures what was picked.
  367520: {
    english: { desc: 'Very Positive', positive: 38640, total: 41283 },
    all: { desc: 'Mostly Positive', positive: 70120, total: 98330 },
  },
  // Celeste, whose store page IGDB names only among its external ids.
  504230: {
    english: { desc: 'Overwhelmingly Positive', positive: 87090, total: 90000 },
    all: { desc: 'Overwhelmingly Positive', positive: 151200, total: 156000 },
  },
  // Silksong II, not out: Steam's own words for nobody having reviewed it.
  1030301: {
    english: { desc: 'No user reviews', positive: 0, total: 0 },
    all: { desc: 'No user reviews', positive: 0, total: 0 },
  },
  // Tunic II, out ten days.
  553421: {
    english: { desc: 'Very Positive', positive: 1700, total: 1900 },
    all: { desc: 'Very Positive', positive: 3300, total: 3700 },
  },
  // NieR: Automata.
  524220: {
    english: { desc: 'Very Positive', positive: 63155, total: 67712 },
    all: { desc: 'Very Positive', positive: 128000, total: 140000 },
  },
};

const send = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
};

const summaryOf = ({ desc, positive, total }) => ({
  num_reviews: total === 0 ? 0 : 1,
  review_score: total === 0 ? 0 : 8,
  review_score_desc: desc,
  total_positive: positive,
  total_negative: total - positive,
  total_reviews: total,
});

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);

  if (url.pathname === '/health') {
    response.writeHead(200).end('ok');
    return;
  }

  if (url.pathname === '/IUserReviewsService/GetAppReviews/v1/') {
    let input;
    try {
      input = JSON.parse(url.searchParams.get('input_json') ?? '');
    } catch {
      send(response, 400, { error: 'input_json is not JSON' });
      return;
    }

    if (typeof input?.appid !== 'number') {
      send(response, 400, { error: 'appid is required' });
      return;
    }

    const app = APPS[input.appid];
    if (app === undefined) {
      send(response, 200, { response: {} });
      return;
    }

    const asked = input.language !== undefined || input.languages !== undefined ? app.all : app.english;
    send(response, 200, {
      response: {
        query_summary: summaryOf(asked),
        reviews: asked.total === 0 ? [] : [{ recommendationid: '1', language: 'english', review: 'A review.' }],
        cursor: '*',
      },
    });
    return;
  }

  response.writeHead(404).end();
});

server.listen(PORT, () => console.log(`Steam stub listening on ${PORT}`));
