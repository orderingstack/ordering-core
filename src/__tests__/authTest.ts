import * as auth from '../auth';
test('getTokenWithPassword', async () => {
  const authSuccess = await auth.authorizeWithUserPass(
    process.env.BASE_URL || '',
    process.env.TENANT || '',
    process.env.BASIC_AUTH || '',
    process.env.ADMIN_USER || '',
    process.env.ADMIN_PASS || '',
  );
  expect(authSuccess).toBe(true);
});

test('getTokenWithRefreshToken', async () => {
  const authSuccess = await auth.authorizeWithRefreshToken(
    process.env.BASE_URL || '',
    process.env.TENANT || '',
    process.env.BASIC_AUTH || '',
    'proper_refresh_token',
  );
  expect(authSuccess).toBe(true);
});

test('getTokenWithRefreshToken - wrong token', async () => {
  const authSuccess = await auth.authorizeWithRefreshToken(
    process.env.BASE_URL || '',
    process.env.TENANT || '',
    process.env.BASIC_AUTH || '',
    'proper_refresh_token1',
  );
  expect(authSuccess).toBe(false);
});

xtest('getAuthData test ', () => {});
