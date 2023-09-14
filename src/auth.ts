import axios from 'axios';
import {
  IAuthData,
  IAuthDataProvider,
  IConfiguredAuthDataProvider,
  IEditableUserData,
  IRefreshTokenStorageHandler,
} from './orderTypes';
import { handleAPIError } from './apiTools';
import { Mutex } from './utils/mutex';

let _authData: IAuthData | null = null;
let tokenRetrieveTimeMs: number = -1;
const mutex = new Mutex(250);

export async function authorizeWithUserPass(
  baseUrl: string,
  tenant: string,
  basicAuthPass: string,
  username: string,
  password: string,
): Promise<boolean> {
  let response = null;
  try {
    response = await axios({
      method: 'post',
      url: `${baseUrl}/auth-oauth2/oauth/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Authorization: `Basic ${basicAuthPass}`,
        'X-Tenant': tenant,
      },
      data: `username=${username}&password=${password}&grant_type=password&scope=read`,
    });
    _authData = response.data;
    tokenRetrieveTimeMs = new Date().getTime();
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
): Promise<boolean> {
  let response = null;
  try {
    const req: any = {
      method: 'post',
      url: `${baseUrl}/auth-oauth2/oauth/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Authorization: `Basic ${basicAuthPass}`,
        'X-Tenant': tenant,
      },
      data: `refresh_token=${refreshToken}&grant_type=refresh_token`,
    };
    //console.log(req);
    response = await axios(req);
    _authData = response.data;
    tokenRetrieveTimeMs = new Date().getTime();
    //console.log('REFRESH TOKEN AUTH RESULT ***');
    //console.log(_authData);
    return true;
  } catch (error) {
    //console.error('Authorization error');
    //console.error(error)
    return false;
  }
}

function isTokenExpired(authData: IAuthData | null): boolean {
  // check if we can use current token
  if (!authData || !authData.access_token) {
    return true;
  }

  const secondsFromRetrievingExistingToken =
    new Date().getTime() - tokenRetrieveTimeMs;
  const expiryIfGreaterThan: number =
    parseInt(authData.expires_in) * 1000 * 0.95; //miliseconds
  return secondsFromRetrievingExistingToken >= expiryIfGreaterThan;
}

export const authDataProvider: IAuthDataProvider = async (
  ctx: any,
  refreshTokenStorageHandler,
  forceRefresh = false,
): Promise<{ token: string; UUID: string }> => {
  // console.log( `authDataProvider invoked ----     currentToken=${  _authData ? _authData.access_token : '(null)'   }`, );
  if (!forceRefresh && _authData && _authData.access_token) {
    if (!isTokenExpired(_authData)) {
      return { token: _authData.access_token, UUID: _authData.UUID };
    }
  }
  //console.log('******** GET AUTH TOKEN (REMOTE CALL) ********');
  let loginSuccess = false;
  const refreshToken = await refreshTokenStorageHandler.getRefreshToken(
    ctx.TENANT,
  );
  if (refreshToken) {
    //console.log('*** AUTHORIZE WITH REFRESH TOKEN ');
    // use mutex to enforce max 1 api call at a time
    loginSuccess = await mutex.getLock<boolean>(() => {
      if (_authData && !isTokenExpired(_authData)) {
        return Promise.resolve(true);
      }
      return authorizeWithRefreshToken(
        ctx.BASE_URL,
        ctx.TENANT,
        ctx.BASIC_AUTH,
        refreshToken,
      );
    });
  }
  if (!loginSuccess && ctx.anonymousAuth) {
    //console.log('**** ANONYMOUS AUTH ****');
    loginSuccess = await authorizeWithUserPass(
      ctx.BASE_URL,
      ctx.TENANT,
      ctx.BASIC_AUTH,
      'anonymous',
      '',
    );
  }
  if (!loginSuccess || !_authData) {
    return { token: '', UUID: '' };
  } else {
    refreshTokenStorageHandler.setRefreshToken(
      ctx.TENANT,
      _authData.refresh_token,
    );
    return { token: _authData.access_token, UUID: _authData.UUID };
  }
};

export function createAuthDataProvider(
  ctx: any,
  refreshTokenProvider: any,
  forceRefresh = false,
): IConfiguredAuthDataProvider {
  return () => authDataProvider(ctx, refreshTokenProvider, forceRefresh);
}

export function setAuthData(
  tenant: string,
  newAuthData: IAuthData,
  refreshTokenStorageHandler: IRefreshTokenStorageHandler,
  newTokenRetrieveTimeMs: number = new Date().getTime(),
) {
  _authData = newAuthData;
  tokenRetrieveTimeMs = newTokenRetrieveTimeMs;
  refreshTokenStorageHandler.setRefreshToken(tenant, _authData.refresh_token);
}

export function clearAuthData(
  tenant: string,
  refreshTokenStorageHandler: IRefreshTokenStorageHandler,
) {
  refreshTokenStorageHandler.clearRefreshToken(tenant);
  _authData = null;
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
