import { IAuthDataProvider, IRefreshTokenHandler } from './orderTypes';
import * as listener from './wsListener';
import { authDataProvider } from './auth';
import * as orderService from './orderService';
import { onOrderError, onOrderUpdate } from './orderStore';

let wsListener: any;

async function init() {
  // listener is responsible for receiving orders from Ordering Stack
  const ctx: any = {
    TENANT: '8724ef16-20c8-4008-b183-3504cedc38af',
    VENUE: '2de9a0c3-4b21-407c-83d1-031ea0735eb3',
    BASE_URL: 'https://ordering.3e.pl',
    BASIC_AUTH: 'Z3V0eTpzZWNyZXQ=',
    USER_NAME: 'testomir6@3e.pl',
    PASSWORD: 'test123',
  };
  let refreshToken: string = '';
  let refreshTokenGood: string =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX25hbWUiOiJ0ZXN0b21pcjZAM2UucGwiLCJzY29wZSI6WyJyZWFkIl0sImF0aSI6ImEyYTRlYTk1LTkwZDgtNDg4ZC1iMGNmLTczMzU4ZDk2Njc2OCIsImV4cCI6MTYxNDU5MzkxMywiVVVJRCI6IjdjN2E4YTdmLTZmMzgtNDQxNC1hNmViLWNiODViM2JmODJkMiIsIlRFTkFOVCI6Ijg3MjRlZjE2LTIwYzgtNDAwOC1iMTgzLTM1MDRjZWRjMzhhZiIsImF1dGhvcml0aWVzIjpbIlJPTEVfUEFZX0NPRCIsIlJPTEVfMmRlOWEwYzMtNGIyMS00MDdjLTgzZDEtMDMxZWEwNzM1ZWIzX01BTkFHRVIiLCJST0xFX01BTkFHRVIiLCJST0xFX1BBWSIsIlJPTEVfQ09PSyIsIlJPTEVfU1UiXSwianRpIjoiM2U4OTA0NmQtYzAxOS00ZDk3LWE2YmUtZGE0Y2U1ZjZmNTYwIiwiY2xpZW50X2lkIjoiZ3V0eSJ9.dl-uPU4wl5e-zm_9L5TlRx7mCdxNg0H1PJgjBSTOkXI';
  const refreshTokenHandler: IRefreshTokenHandler = {
    getRefreshToken: () => refreshToken,
    setRefreshToken: (_refreshToken: string) => {
      refreshToken = _refreshToken;
    },
  };
  const params: listener.ConnectWebSocketsParams = {
    ctx,
    tenant: ctx.TENANT,
    venue: ctx.VENUE,
    authDataProvider: authDataProvider,
    refreshTokenHandler,
    onConnectedAsync: async (accessToken: any): Promise<any> => {
      console.log('ws connected!');
      //   webSocketConnected = true;
      const orders = await orderService.pullOrders(ctx, ctx.VENUE, accessToken);
      for (const order of orders) {
        onOrderUpdate(order);
      }
    },
    onDisconnectAsync: async (): Promise<void> => {
      console.log('ws disconnected');
      //webSocketConnected = false;
    },
    onKDSMessageAsync: async (message: any): Promise<void> => {
      // we have new message
      console.log(`MESSAGE  order [${message.id}]`);
      onOrderUpdate(message);
    },
    onOrdersUpdateAsync: async (order: any): Promise<void> => {
      console.log(`new or updated order [${order.id}]`);
      onOrderUpdate(order);
    },
    onNotificationAsync: async (message: any): Promise<void> => {
      onOrderError(message);
      console.log(`NOTIFICATION: ${JSON.stringify(message)}`);
    },
    onAuthFailure: async () => {
      console.log('------------- MANUAL AUTH REQUIRED ----------------- ');
      setTimeout(() => {
        refreshTokenHandler.setRefreshToken(refreshTokenGood);
        wsListener = listener.connectWebSockets(params);
      }, 3000);
    },
  };
  wsListener = listener.connectWebSockets(params);
}

(async () => {
  try {
    await init();
  } catch (ex) {
    console.log(ex);
  }
})();
