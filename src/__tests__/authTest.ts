import * as auth from '../auth';
import { server } from '../__mocks__/server';
import { rest, restContext } from 'msw';
import querystring from 'querystring';
// import { mockDate } from '../__mocks__/mockDate';
import { getLoggedUserData, isTokenExpired, updateUserData } from '../auth';
import { IRefreshTokenStorageHandler } from '../orderTypes';
import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';
import { goodAuthResponseBody } from '../__mocks__/handlers';

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
    goodAuthResponseBody.refresh_token,
  );
  expect(authSuccess).toBe(true);
});

test('getAuthData - makes only 1 API call with multiple concurrent request for access_token having refresh_token', async () => {
  server.use(
    rest.post(authUrl, (req, res, ctx) => {
      return res(ctx.status(200), ctx.json(goodAuthResponseBody));
    }),
  );
  const dispatchRequest = jest.fn();
  server.events.on('request:start', dispatchRequest);
  const tokenProvider: IRefreshTokenStorageHandler = {
    getRefreshToken: jest
      .fn()
      .mockResolvedValue(goodAuthResponseBody.refresh_token),
    setRefreshToken: jest.fn().mockResolvedValue(undefined),
    clearRefreshToken: jest.fn().mockResolvedValue(undefined),
  };
  // Clear _authData from other tests
  auth.clearAuthData('any_tenant', tokenProvider);
  const results = await Promise.all(
    Array(10)
      .fill(0)
      .map(() => auth.authDataProvider(testData, tokenProvider)),
  );
  expect(
    results.every(
      (result) => result.token === goodAuthResponseBody.access_token,
    ),
  ).toBe(true);
  expect(dispatchRequest).toHaveBeenCalledTimes(1);
});

test('getAuthData - makes 10 API calls with multiple concurrent request if network error', async () => {
  server.use(
    rest.post(authUrl, (req, resp, ctx) => {
      return resp.networkError('Failed to connect');
    }),
  );
  const dispatchRequest = jest.fn();
  server.events.on('request:start', dispatchRequest);
  const tokenProvider: IRefreshTokenStorageHandler = {
    getRefreshToken: jest
      .fn()
      .mockResolvedValue(goodAuthResponseBody.refresh_token),
    setRefreshToken: jest.fn().mockResolvedValue(undefined),
    clearRefreshToken: jest.fn().mockResolvedValue(undefined),
  };
  // Clear _authData from other tests
  auth.clearAuthData('any_tenant', tokenProvider);
  const results = await Promise.all(
    Array(10)
      .fill(0)
      .map(() => auth.authDataProvider(testData, tokenProvider)),
  );
  expect(results.every((result) => result.token === '')).toBe(true);
  expect(dispatchRequest).toHaveBeenCalledTimes(10);
});

test('getTokenWithRefreshToken - wrong token', async () => {
  const authSuccess = await auth.authorizeWithRefreshToken(
    testData.BASE_URL,
    testData.TENANT,
    testData.BASIC_AUTH,
    'invalid_token',
  );
  expect(authSuccess).toBe(false);
});

const authUrl = `${testData.BASE_URL}/auth-oauth2/oauth/token`;

test('getAuthData - return existing token if it is still valid ', async () => {
  const validToken = jwt.sign(
    {
      exp: dayjs().add(20, 'second').unix(),
    },
    'secret',
  );
  const refreshHandler = {
    getRefreshToken: (tenant: string) =>
      new Promise<string>((resolve) => resolve('TEST_REFRESH_TOKEN')),
    setRefreshToken: (tenant: string) =>
      new Promise<void>((resolve) => resolve()),
    clearRefreshToken: (tenant: string) =>
      new Promise<void>((resolve) => resolve()),
  };
  const ctx = {
    BASE_URL: testData.BASE_URL,
    TENANT: testData.TENANT,
    BASIC_AUTH: testData.BASIC_AUTH,
    anonymousAuth: true,
  };

  auth.setAuthData(
    'tenant1',
    {
      expires_in: '3600',
      access_token: validToken,
      UUID: 'user1',
      refresh_token: 'refresh1',
    },
    refreshHandler,
  );
  const { token, UUID } = await auth.authDataProvider(
    ctx,
    refreshHandler,
    false,
  );
  expect(token).toBe(validToken);
});

test('getAuthData - clears refresh token if expired and does NOT call oauth2 api', async () => {
  const expiredToken = jwt.sign(
    {
      exp: dayjs().subtract(1, 'second').unix(),
    },
    'secret',
  );
  const clearRefreshToken = jest.fn();
  const dispatchRequest = jest.fn();
  server.events.on('request:start', dispatchRequest);
  const refreshHandler = {
    getRefreshToken: (tenant: string) => expiredToken,
    setRefreshToken: (tenant: string) => {},
    clearRefreshToken: clearRefreshToken,
  };
  const ctx = {
    BASE_URL: testData.BASE_URL,
    TENANT: testData.TENANT,
    BASIC_AUTH: testData.BASIC_AUTH,
    anonymousAuth: false,
  };

  auth.setAuthData(
    testData.TENANT,
    {
      expires_in: '3600',
      access_token: expiredToken,
      UUID: 'user1',
      refresh_token: expiredToken,
    },
    refreshHandler,
  );
  const { token, UUID } = await auth.authDataProvider(
    ctx,
    refreshHandler,
    false,
  );
  expect(token).toBe('');
  expect(UUID).toBe('');
  expect(clearRefreshToken).toHaveBeenCalledTimes(1);
  expect(clearRefreshToken).toHaveBeenCalledWith(testData.TENANT);
  expect(dispatchRequest).toHaveBeenCalledTimes(0);
});

test('getAuthData - use refresh token to retrieve new token if existing token expired', async () => {
  const expiredToken = jwt.sign(
    {
      exp: dayjs().subtract(1, 'second').unix(),
    },
    'secret',
  );
  const validRefreshToken = jwt.sign(
    {
      exp: dayjs().add(24, 'hour').unix(),
    },
    'secret',
  );
  const validAccessToken = jwt.sign(
    {
      exp: dayjs().add(1, 'hour').unix(),
    },
    'secret2',
  );

  server.use(
    rest.post(authUrl, (req, resp, ctx) => {
      const params = querystring.parse('' + req.body);
      const grantType = params['grant_type'];
      if (grantType === 'refresh_token') {
        const refreshToken = params['refresh_token'];
        if (refreshToken === validRefreshToken) {
          return resp(
            ctx.status(200),
            ctx.json({
              access_token: validAccessToken,
              expires_in: '3600',
              UUID: 'user_uuid123',
              refresh_token: validRefreshToken,
            }),
          );
        }
      }
      return resp(ctx.status(403));
    }),
  );
  const refreshHandler = {
    getRefreshToken: (tenant: string) => validRefreshToken,
    setRefreshToken: (tenant: string) => {},
    clearRefreshToken: (tenant: string) => {},
  };
  const ctx = {
    BASE_URL: testData.BASE_URL,
    TENANT: testData.TENANT,
    BASIC_AUTH: testData.BASIC_AUTH,
    anonymousAuth: false,
  };

  auth.setAuthData(
    'tenant1',
    {
      expires_in: '3600',
      access_token: expiredToken,
      UUID: 'user1',
      refresh_token: 'refresh1',
    },
    refreshHandler,
  );
  const { token, UUID } = await auth.authDataProvider(
    ctx,
    refreshHandler,
    false,
  );
  expect(token).toBe(validAccessToken);
  expect(UUID).toBe('user_uuid123');
});

test('getAuthData - use refresh token to retrieve new token if existing token is to expire within 10 seconds', async () => {
  const expiredToken = jwt.sign(
    {
      exp: dayjs().subtract(1, 'second').unix(),
    },
    'secret',
  );
  const validRefreshToken = jwt.sign(
    {
      exp: dayjs().add(24, 'hour').unix(),
    },
    'secret',
  );
  const validAccessToken = jwt.sign(
    {
      exp: dayjs().add(1, 'hour').unix(),
    },
    'secret2',
  );
  server.use(
    rest.post(authUrl, (req, resp, ctx) => {
      const params = querystring.parse('' + req.body);
      const grantType = params['grant_type'];
      if (grantType === 'refresh_token') {
        const refreshToken = params['refresh_token'];
        if (refreshToken === validRefreshToken) {
          return resp(
            ctx.status(200),
            ctx.json({
              access_token: validAccessToken,
              expires_in: '3600',
              UUID: 'user_uuid123',
              refresh_token: validRefreshToken,
            }),
          );
        }
      }
      return resp(ctx.status(403));
    }),
  );
  const refreshHandler = {
    getRefreshToken: (tenant: string) => validRefreshToken,
    setRefreshToken: (tenant: string) => {},
    clearRefreshToken: (tenant: string) => {},
  };
  const ctx = {
    BASE_URL: testData.BASE_URL,
    TENANT: testData.TENANT,
    BASIC_AUTH: testData.BASIC_AUTH,
    anonymousAuth: true,
  };

  auth.setAuthData(
    'tenant1',
    {
      expires_in: '3600',
      access_token: expiredToken,
      UUID: 'user1',
      refresh_token: 'refresh1',
    },
    refreshHandler,
  );
  const { token, UUID } = await auth.authDataProvider(
    ctx,
    refreshHandler,
    false,
  );
  expect(token).toBe(validAccessToken);
  expect(UUID).toBe('user_uuid123');
});

const userDataUrl = `${testData.BASE_URL}/auth-api/api/me`;
const validUserData = {
  firstName: 'testname',
  email: 'email@email.com',
  UUID: 'uuid_1',
};

beforeEach(() => {
  // Setup server
  server.use(
    rest.get(userDataUrl, (req, res, ctx) => {
      if (
        req.headers.get('authorization') ===
        `Bearer ${goodAuthResponseBody.access_token}`
      ) {
        return res(ctx.status(200), ctx.json(validUserData));
      }
      return res(ctx.status(401));
    }),
  );

  server.use(
    rest.post(userDataUrl, (req, res, ctx) => {
      if (
        req.headers.get('authorization') ===
        `Bearer ${goodAuthResponseBody.access_token}`
      ) {
        return res(ctx.status(200), ctx.json(true));
      }
      return res(ctx.status(401));
    }),
  );
});

test('getLoggedUserData', async () => {
  const userData = await getLoggedUserData(
    testData.BASE_URL,
    goodAuthResponseBody.access_token,
  );
  expect(userData).toMatchObject(validUserData);
});

test('updateUserData', async () => {
  const result = await updateUserData(
    testData.BASE_URL,
    goodAuthResponseBody.access_token,
    {
      phone: '123',
      firstName: 'testname',
    },
  );
  expect(result).toBe(true);
});

test('updateUserData - invalid token', async () => {
  const onError = jest.fn();
  await updateUserData(testData.BASE_URL, 'INVALID_TEST_TOKEN', {
    phone: '123',
    firstName: 'testname',
  }).catch(onError);
  expect(onError).toHaveBeenCalled();
});

describe('token expiry function', () => {
  test('returns expired after expiry & 10s before', () => {
    expect(
      isTokenExpired(
        jwt.sign(
          {
            exp: dayjs().subtract(10, 'second').unix(),
          },
          'secret',
        ),
      ),
    ).toBe(true);
    expect(
      isTokenExpired(
        jwt.sign(
          {
            exp: dayjs().add(10, 'second').unix(),
          },
          'secret',
        ),
      ),
    ).toBe(true);
  });
  test('returns not expired 11s before expiry', () => {
    expect(
      isTokenExpired(
        jwt.sign(
          {
            exp: dayjs().add(11, 'second').unix(),
          },
          'secret',
        ),
      ),
    ).toBe(false);
  });
});
