import axios, { isAxiosError } from 'axios';
import {
  IAuthData,
  IAuthDataProvider,
  IEditableUserData,
  IRefreshTokenStorageHandler,
} from './orderTypes';
import { handleAPIError } from './apiTools';
import { Mutex } from './utils/mutex';
import { jwtDecode } from 'jwt-decode';
import { EventEmitter } from 'my-events';

const _authDataMap: Map<string, IAuthData> = new Map();
const mutex = new Mutex(250);
const invalidRefreshTokens = new Map<string, number>();

interface ITokenData {
  user_name: string;
  scope: string[];
  ati?: string;
  MFA?: 'T' | 'F';
  exp: number;
  UUID: string;
  TENANT: string;
  authorities: string[];
  jti?: string;
  client_id: string;
}

class TokenExpirationEmitter extends EventEmitter {
  constructor() {
    super();
  }
  public notify(tenant: string, error: any) {
    this.emit(`refreshTokenInvalid-${tenant}`, error);
  }
}
const RefreshTokenNotifier = new TokenExpirationEmitter();

export function purgeTokenCache(): void {
  const keys = invalidRefreshTokens.keys();
  for (const key of keys) {
    invalidRefreshTokens.delete(key);
  }
}

export async function authorizeWithUserPass(
  baseUrl: string,
  tenant: string,
  basicAuthPass: string,
  username: string,
  password: string,
): Promise<boolean> {
  let response = null;
  try {
    response = await axios.post<IAuthData>(
      `${baseUrl}/auth-oauth2/oauth/token`,
      { username, password, grant_type: 'password', scope: 'read' },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Authorization: `Basic ${basicAuthPass}`,
          'X-Tenant': tenant,
        },
      },
    );
    _authDataMap.set(tenant, response.data);
    return true;
  } catch (error) {
    //console.error('Authorization error');
    //console.error(error);
    return false;
  }
}

export async function authorizeWithRefreshToken(
  baseUrl: string,
  tenant: string,
  basicAuthPass: string,
  refreshToken: string,
): Promise<
  | { success: true; removeToken?: undefined }
  | { success: false; removeToken: boolean }
> {
  let response = null;
  try {
    response = await axios.post<IAuthData>(
      `${baseUrl}/auth-oauth2/oauth/token`,
      { refresh_token: refreshToken, grant_type: 'refresh_token' },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          Authorization: `Basic ${basicAuthPass}`,
          'X-Tenant': tenant,
        },
      },
    );
    _authDataMap.set(tenant, response.data);
    // console.log('authData', _authData);
    //console.log('REFRESH TOKEN AUTH RESULT ***');
    //console.log(_authData);
    return { success: true };
  } catch (error: any) {
    if (isAxiosError(error) && /^4\d{2}$/.test(`${error.response?.status}`)) {
      invalidRefreshTokens.set(refreshToken, Date.now());
      if (error.response?.data?.error === 'invalid_grant') {
        console.warn('invalid_grant', tenant);
        RefreshTokenNotifier.notify(tenant, error);
        // token invalid or expired, remove it
        return { success: false, removeToken: true };
      }
    }
    //console.error('Authorization error');
    // console.error(error);
    return { success: false, removeToken: false };
  }
}

export function isTokenExpired(token?: string) {
  // check if we can use current token
  if (token) {
    try {
      return (
        // 10s before actual expiry
        jwtDecode<ITokenData>(token).exp * 1000 < new Date().getTime() + 10000
      );
    } catch (error) {
      // Not a JWT token
      return true;
    }
  }
  return true;
}

function isJwtToken(token: string) {
  try {
    jwtDecode<ITokenData>(token);
    return true;
  } catch (error) {
    return false;
  }
}

export const authDataProvider: IAuthDataProvider = async (
  ctx: any,
  refreshTokenStorageHandler,
  forceRefresh = false,
): Promise<{ token: string; UUID: string }> => {
  // console.log( `authDataProvider invoked ----     currentToken=${  _authData ? _authData.access_token : '(null)'   }`, );
  let authData = _authDataMap.get(ctx.TENANT);
  if (!forceRefresh && authData && authData.access_token) {
    // console.log('auth data has access token');
    if (!isTokenExpired(authData.access_token)) {
      return { token: authData.access_token, UUID: authData.UUID };
    } else {
      console.log('access token is expired');
    }
  }
  //console.log('******** GET AUTH TOKEN (REMOTE CALL) ********');
  let loginSuccess = false;
  const refreshToken = await refreshTokenStorageHandler.getRefreshToken(
    ctx.TENANT,
  );
  console.log('have refresh token?', !!refreshToken, 'tenant', ctx.TENANT);
  if (isJwtToken(refreshToken) && isTokenExpired(refreshToken)) {
    refreshTokenStorageHandler.clearRefreshToken(ctx.TENANT);
  }
  if (
    refreshToken &&
    (!isJwtToken(refreshToken) || !isTokenExpired(refreshToken))
  ) {
    //console.log('*** AUTHORIZE WITH REFRESH TOKEN ');
    // use mutex to enforce max 1 api call at a time
    const result = await mutex.getLock<
      Awaited<ReturnType<typeof authorizeWithRefreshToken>>
    >(() => {
      authData = _authDataMap.get(ctx.TENANT);
      if (authData && !isTokenExpired(authData.access_token)) {
        return Promise.resolve({ success: true });
      }
      // If same refresh token was invalid less then 30s ago skip api call
      const invalidTokenTimestamp = invalidRefreshTokens.get(refreshToken);
      if (invalidTokenTimestamp && Date.now() < invalidTokenTimestamp + 30000) {
        return Promise.resolve({ success: false, removeToken: false });
      }
      return authorizeWithRefreshToken(
        ctx.BASE_URL,
        ctx.TENANT,
        ctx.BASIC_AUTH,
        refreshToken,
      );
    });
    loginSuccess = result.success;
    if (result.removeToken) {
      await refreshTokenStorageHandler.clearRefreshToken(ctx.TENANT);
    }
  }
  if (!loginSuccess && ctx.anonymousAuth) {
    // console.log('**** ANONYMOUS AUTH ****');
    loginSuccess = await authorizeWithUserPass(
      ctx.BASE_URL,
      ctx.TENANT,
      ctx.BASIC_AUTH,
      'anonymous',
      '',
    );
  }
  authData = _authDataMap.get(ctx.TENANT);
  if (!loginSuccess || !authData) {
    return { token: '', UUID: '' };
  } else {
    refreshTokenStorageHandler.setRefreshToken(
      ctx.TENANT,
      authData.refresh_token,
    );
    return { token: authData.access_token, UUID: authData.UUID };
  }
};

export function createAuthDataProvider(
  ctx: any,
  refreshTokenProvider: IRefreshTokenStorageHandler,
  forceRefresh = false,
  refreshTokenErrorCallback?: (error: any) => void,
) {
  RefreshTokenNotifier.on(`refreshTokenInvalid-${ctx.TENANT}`, (error: any) => {
    refreshTokenErrorCallback?.(error);
  });
  return () => authDataProvider(ctx, refreshTokenProvider, forceRefresh);
}

export function setAuthData(
  tenant: string,
  newAuthData: IAuthData,
  refreshTokenStorageHandler: IRefreshTokenStorageHandler,
) {
  _authDataMap.set(tenant, newAuthData);
  refreshTokenStorageHandler.setRefreshToken(tenant, newAuthData.refresh_token);
}

export function clearAuthData(
  tenant: string,
  refreshTokenStorageHandler: IRefreshTokenStorageHandler,
) {
  refreshTokenStorageHandler.clearRefreshToken(tenant);
  _authDataMap.delete(tenant);
}

export async function getLoggedUserData(baseURL: string, token: string) {
  const response = await axios({
    method: 'get',
    url: `${baseURL}/auth-api/api/me`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }).catch(handleAPIError);
  return response ? response.data : null;
}

export async function updateUserData(
  baseURL: string,
  token: string,
  userData: IEditableUserData,
): Promise<boolean> {
  const response = await axios
    .post(`${baseURL}/auth-api/api/me`, userData, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    .catch(handleAPIError);
  return (response && response.data) || false;
}

export async function deleteUser(
  baseURL: string,
  token: string,
): Promise<boolean> {
  const { login } = await getLoggedUserData(baseURL, token);
  const response = await axios
    .request<boolean>({
      url: `${baseURL}/auth-api/api/me`,
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: { login },
    })
    .catch(handleAPIError);
  return (response && response.data) || false;
}
