import { IAuthDataProvider, IRefreshTokenHandler } from './orderTypes';
import * as listener from './wsListener';
import * as orderService from './orderService';
import * as orderStore from './orderStore';

export function orderChangesListener(
  BASE_URL: string,
  TENANT: string,
  VENUE: string,
  authDataProvider: IAuthDataProvider,
  refreshTokenHandler: IRefreshTokenHandler,
  onOrderUpdatedCallback: Function,
): Promise<void> {
  return new Promise((resolve, reject) => {
    orderStore.setOrderStoreUpdatedCallback(onOrderUpdatedCallback);
    const params: listener.ConnectWebSocketsParams = {
      baseURL: BASE_URL,
      tenant: TENANT,
      venue: VENUE,
      authDataProvider: authDataProvider,
      refreshTokenHandler,
      onConnectedAsync: async (accessToken: any): Promise<any> => {
        console.log('ws connected!');
        const orders = await orderService.pullOrdersForUser(
          BASE_URL,
          //VENUE,
          accessToken,
        );
        for (const order of orders) {
          orderStore.onOrderUpdate(order);
        }
        resolve();
      },
      onDisconnectAsync: async (): Promise<void> => {
        console.log('ws disconnected');
      },
      onKDSMessageAsync: null,
      // onKDSMessageAsync: async (message: any): Promise<void> => {
      //   console.log(`MESSAGE  order [${message.id}]`);
      //   orderStore.onOrderUpdate(message);
      // },
      onOrdersUpdateAsync: async (order: any): Promise<void> => {
        console.log(`new or updated order [${order.id}]`);
        orderStore.onOrderUpdate(order);
      },
      onNotificationAsync: async (message: any): Promise<void> => {
        orderStore.onOrderError(message);
        console.log(`NOTIFICATION: ${JSON.stringify(message)}`);
      },
      onAuthFailure: async () => {
        console.log('------------- MANUAL AUTH REQUIRED ----------------- ');
      },
    };
    listener.connectWebSockets(params);
  });
}
