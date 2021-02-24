import { IAuthDataProvider, IRefreshTokenHandler } from '../orderTypes';

export const authDataProvider: IAuthDataProvider = async (
  ctx: any,
  refreshTokenHandler: IRefreshTokenHandler,
  forceRefresh?: boolean,
) => {
  return {
    token: 'test',
    UUID: '123',
  };
};
