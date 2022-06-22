import * as auth from '../auth';
import { server } from '../__mocks__/server';
import { rest, restContext } from 'msw';
import querystring from 'querystring';
import { mockDate } from '../__mocks__/mockDate';
import { getLoggedUserData, updateUserData } from '../auth';

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
    getRefreshToken: (tenant: string) => new Promise<string>((resolve)=> resolve('TEST_REFRESH_TOKEN')),
    setRefreshToken: (tenant: string) => new Promise<void>((resolve)=> resolve() ),
    clearRefreshToken: (tenant: string) => new Promise<void>((resolve)=> resolve() ),
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

const userDataUrl = `${testData.BASE_URL}/auth-api/api/me`;
const validUserData = {
  firstName: "testname",
  email: "email@email.com",
  UUID: "uuid_1"
}

beforeEach(()=>{
  // Setup server
  server.use(
    rest.get(userDataUrl, (req, res, ctx) =>{
      if (req.headers.get("authorization") === "Bearer VALID_TEST_TOKEN"){
        return res(        ctx.status(200),
          ctx.json(validUserData))
      }
    })
  )

  server.use(
    rest.post(userDataUrl, (req, res, ctx) =>{
      if (req.headers.get("authorization") === "Bearer VALID_TEST_TOKEN"){
        return res(        ctx.status(200),
          ctx.json(true))
      }
      return res(ctx.status(401))
    })
  )
})

test("getLoggedUserData", async()=>{
  const userData = await getLoggedUserData(testData.BASE_URL, "VALID_TEST_TOKEN")
  expect(userData).toMatchObject(validUserData)
})

test("updateUserData", async()=>{
  const result = await updateUserData(testData.BASE_URL, "VALID_TEST_TOKEN", {
    phone: "123",
    firstName: "testname"
  })
  expect(result).toBe(true)
})

test("updateUserData - invalid token", async()=>{
  const onError = jest.fn()
  await updateUserData(testData.BASE_URL, "INVALID_TEST_TOKEN", {
    phone: "123",
    firstName: "testname"
  }).catch(onError)
  expect(onError).toHaveBeenCalled()
})