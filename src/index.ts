import { IAuthDataProvider, IRefreshTokenHandler } from './orderTypes';
import * as listener from './wsListener';
import { authDataProvider } from './auth';
import * as orderService from './orderService';
import { onOrderError, onOrderUpdate } from './orderStore';
require('dotenv').config();

async function init() {
  // listener is responsible for receiving orders from Ordering Stack
  const ctx: any = {
    TENANT: process.env.TENANT,
    VENUE: process.env.VENUE,
    BASE_URL: process.env.BASE_URL,
    BASIC_AUTH: process.env.BASE_URL,
    USER_NAME: process.env.ADMIN_USER,
    PASSWORD: process.env.ADMIN_PASS,
  };
  let refreshToken: string = '';
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
    },
  };
  listener.connectWebSockets(params);
}

(async () => {
  try {
    await init();
  } catch (ex) {
    console.log(ex);
  }
})();
