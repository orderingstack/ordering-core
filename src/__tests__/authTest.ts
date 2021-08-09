import * as auth from '../auth';
import { server } from '../__mocks__/server';
import { rest } from 'msw';
import querystring from 'querystring';
import { mockDate } from '../__mocks__/mockDate';

const testData = {
  ADMIN_USER: 'test@test.pl',
  ADMIN_PASS: 'hello',
  TENANT: 'tenant123',
  VENUE: 'venue1',
  BASE_URL: 'http://localhost',
  BASIC_AUTH: 'abc',
};

test('getTokenWithPassword', async () => {
  const authSuccess = await auth.authorizeWithUserPass(
    testData.BASE_URL,
    testData.TENANT,
    testData.BASIC_AUTH,
    testData.ADMIN_USER,
    testData.ADMIN_PASS,
  );
  expect(authSuccess).toBe(true);
});

test('getTokenWithRefreshToken', async () => {
  const authSuccess = await auth.authorizeWithRefreshToken(
    testData.BASE_URL,
    testData.TENANT,
    testData.BASIC_AUTH,
    'proper_refresh_token',
  );
  expect(authSuccess).toBe(true);
});

test('getTokenWithRefreshToken - wrong token', async () => {
  const authSuccess = await auth.authorizeWithRefreshToken(
    testData.BASE_URL,
    testData.TENANT,
    testData.BASIC_AUTH,
    'proper_refresh_token1',
  );
  expect(authSuccess).toBe(false);
});

const authUrl = `${testData.BASE_URL}/auth-oauth2/oauth/token`;

test('getAuthData - return existing token if it is still valid ', async () => {
  const refreshHandler = {
    getRefreshToken: (tenant: string) => 'TEST_REFRESH_TOKEN',
    setRefreshToken: (tenant: string) => {},
    clearRefreshToken: (tenant: string) => {},
  };
  const ctx = {
    BASE_URL: testData.BASE_URL,
    TENANT: testData.TENANT,
    BASIC_AUTH: testData.BASIC_AUTH,
    anonymousAuth: true,
  };

  const timeFreeze = new Date('2020-10-01T00:10:01.30Z'); //zero time
  const resetDateMock = mockDate(timeFreeze);
  auth.setAuthData(
    'tenant1',
    {
      expires_in: '3600',
      access_token: '123456',
      UUID: 'user1',
      refresh_token: 'refresh1',
    },
    refreshHandler,
    new Date('2020-10-01T00:09:01.30Z').valueOf(), //1 minute ago
  );
  const { token, UUID } = await auth.authDataProvider(
    ctx,
    refreshHandler,
    false,
  );
  expect(token).toBe('123456');
  resetDateMock();
});

test('getAuthData - use refresh token to retrieve new token if existing token expired ', async () => {
  server.use(
    rest.post(authUrl, (req, resp, ctx) => {
      const params = querystring.parse('' + req.body);
      const grantType = params['grant_type'];
      if (grantType === 'refresh_token') {
        const refreshToken = params['refresh_token'];
        if (refreshToken === 'TEST_REFRESH_TOKEN') {
          return resp(
            ctx.status(200),
            ctx.json({
              access_token: '123456',
              expires_in: '3600',
              UUID: 'user_uuid123',
              refresh_token: 'proper_refresh_token',
            }),
          );
        }
      }
      return resp(ctx.status(403));
    }),
  );
  const refreshHandler = {
    getRefreshToken: (tenant: string) => 'TEST_REFRESH_TOKEN',
    setRefreshToken: (tenant: string) => {},
    clearRefreshToken: (tenant: string) => {},
  };
  const ctx = {
    BASE_URL: testData.BASE_URL,
    TENANT: testData.TENANT,
    BASIC_AUTH: testData.BASIC_AUTH,
    anonymousAuth: true,
  };

  const timeFreeze = new Date('2020-10-01T12:10:01.30Z'); //zero time
  const resetDateMock = mockDate(timeFreeze);
  auth.setAuthData(
    'tenant1',
    {
      expires_in: '3600',
      access_token: '123456',
      UUID: 'user1',
      refresh_token: 'refresh1',
    },
    refreshHandler,
    new Date('2020-10-01T11:09:01.30Z').valueOf(), //1 hour and 1 minute ago (token shoud be expired)
  );
  const { token, UUID } = await auth.authDataProvider(
    ctx,
    refreshHandler,
    false,
  );
  expect(token).toBe('123456');
  expect(UUID).toBe('user_uuid123');
  resetDateMock();
});
