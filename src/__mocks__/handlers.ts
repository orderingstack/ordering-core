import { rest } from 'msw';
import querystring from 'querystring';
const authUrl = `http://localhost/auth-oauth2/oauth/token`;

import jwt from 'jsonwebtoken';
import dayjs from 'dayjs';

export const goodAuthResponseBody = {
  access_token: jwt.sign({ exp: dayjs().add(1, 'hour').unix() }, 'secret'),
  expires_in: '3600',
  UUID: 'user_uuid',
  refresh_token: jwt.sign({ exp: dayjs().add(24, 'hour').unix() }, 'secret'),
};

export const handlers = [
  rest.post(authUrl, (req, resp, ctx) => {
    const params = querystring.parse('' + req.body);
    const grantType = params['grant_type'];
    if (grantType === 'password') {
      const username = params['username'];
      if (username === 'test@test.pl') {
        return resp(
          ctx.delay(2000),
          ctx.status(200),
          ctx.json(goodAuthResponseBody),
        );
      }
      if (username === 'anonymous') {
        return resp(
          ctx.delay(2000),
          ctx.status(200),
          ctx.json(goodAuthResponseBody),
        );
      }
    }
    if (grantType === 'refresh_token') {
      const refreshToken = params['refresh_token'];
      if (refreshToken === goodAuthResponseBody.refresh_token) {
        return resp(
          ctx.delay(2000),
          ctx.status(200),
          ctx.json(goodAuthResponseBody),
        );
      }
    }
    return resp(ctx.delay(2000), ctx.status(403));
  }),
];
