import { rest } from 'msw';
import querystring from 'querystring';
require('dotenv').config();
const authUrl = `${process.env.BASE_URL}/auth-oauth2/oauth/token`;
//console.log(`mock handler for ${authUrl}`);

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
      if (username === 'testomir6@3e.pl') {
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
