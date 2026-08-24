/**
 * The sign-in providers the API offers.
 *
 * A literal list rather than something fetched, for the reason `THEMES` and `HOBBIES` are: there
 * is no endpoint to read it from, and inventing one would mean the server describing its own
 * configuration to a client that only needs to draw two buttons.
 *
 * The ids are copies of `AuthProviders` on the server and must stay copies — they are the
 * `{provider}` segment of the sign-in route, the OAuth scheme name, and the value stored in
 * `auth_identities.provider`, all at once. A third provider is one line here and a config block
 * there.
 */
export const PROVIDERS = [
  { id: 'google', label: 'Continue with Google' },
  { id: 'discord', label: 'Continue with Discord' },
] as const;

export type Provider = (typeof PROVIDERS)[number]['id'];
