import { IAuthDataProvider, IRefreshTokenStorageHandler } from '../orderTypes';

export const authDataProvider: IAuthDataProvider = async (
  ctx: any,
  refreshTokenHandler: IRefreshTokenStorageHandler,
  forceRefresh?: boolean,
) => {
  return {
    token: 'test',
    UUID: '123',
  };
};
