/**
 * The port the e2e API listens on, one above the development one.
 *
 * Here rather than in `playwright.config.ts` alone, so a spec that has to reach the API itself,
 * past Vite, uses the number the config starts it on. `pictures.spec.ts` is one: it asks the API
 * with `Expect: 100-continue`, which a proxy in between would answer for it.
 */
export const API_PORT = 5202;
