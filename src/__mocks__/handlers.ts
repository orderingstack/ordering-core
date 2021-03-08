import { rest } from 'msw';
import querystring from 'querystring';
const authUrl = `http://localhost/auth-oauth2/oauth/token`;

const goodAuthResponseBody = {
  access_token: 'proper_access_token',
  expires_in: '3600',
  UUID: 'user_uuid',
  refresh_token: 'proper_refresh_token',
};

export const handlers = [
  rest.post(authUrl, (req, resp, ctx) => {
    const params = querystring.parse('' + req.body);
    const grantType = params['grant_type'];
    if (grantType === 'password') {
      const username = params['username'];
      if (username === 'test@test.pl') {
        return resp(ctx.status(200), ctx.json(goodAuthResponseBody));
      }
      if (username === 'anonymous') {
        return resp(ctx.status(200), ctx.json(goodAuthResponseBody));
      }
    }
    if (grantType === 'refresh_token') {
      const refreshToken = params['refresh_token'];
      if (refreshToken === 'proper_refresh_token') {
        return resp(ctx.status(200), ctx.json(goodAuthResponseBody));
      }
    }
    return resp(ctx.status(403));
  }),
];
