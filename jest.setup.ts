import { server } from './src/__mocks__/server';
import { purgeTokenCache } from './src/auth';
// Establish API mocking before all tests.
beforeAll(() => server.listen());
// Reset any request handlers and token cache that we may add during the tests,
// so they don't affect other tests.
afterEach(() => {
  server.resetHandlers();
  purgeTokenCache();
});
// Clean up after the tests are finished.
afterAll(() => server.close());
