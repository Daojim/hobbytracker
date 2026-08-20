import { setupServer } from 'msw/node';

/**
 * No handlers by default. Every test states the responses it depends on, so a test can never
 * pass because some other test's fixture happened to still be installed.
 */
export const server = setupServer();
