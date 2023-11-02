import {
  IAuthDataProvider,
  IConfiguredAuthDataProvider,
  IRefreshTokenStorageHandler,
} from './orderTypes';
import * as listener from './wsListener';
import * as orderService from './orderService';
import * as orderStore from './orderStore';
import {
  INotificationMessage,
  ISteeringCommand,
} from '@orderingstack/ordering-types';

export function orderChangesListener(
  BASE_URL: string,
  TENANT: string,
  VENUE: string,
  authDataProvider: IConfiguredAuthDataProvider,
  //refreshTokenHandler: IRefreshTokenStorageHandler,
  onOrderUpdatedCallback: Function,
  _onAuthFailureCallback: Function,
  enableKDS: boolean,
  websocketMessageCallback?: (message: INotificationMessage) => void,
  onSteeringCommand?: (message: ISteeringCommand) => void,
): Promise<() => Promise<void>> {
  return new Promise(async (resolve, reject) => {
    orderStore.setOrderStoreUpdatedCallback(onOrderUpdatedCallback);
    const params: listener.ConnectWebSocketsParams = {
      baseURL: BASE_URL,
      tenant: TENANT,
      venue: VENUE,
      authDataProvider: authDataProvider,
      onConnectedAsync: async (accessToken: any): Promise<any> => {
        console.log('Websocket connected async');
        let orders;
        if (!enableKDS) {
          //console.log('-- pull orders for user -- ');
          orders = await orderService.pullOrdersForUser(BASE_URL, accessToken);
        } else {
          // KDS version
          //console.log('-- pull orders KDS -- ');
          orders = await orderService.pullOrders(BASE_URL, VENUE, accessToken);
        }
        for (const order of orders) {
          orderStore.onOrderUpdate(order, enableKDS, VENUE);
        }
      },
      onDisconnectAsync: async (): Promise<void> => {
        console.log('ws disconnected');
      },
      onKDSMessageAsync: null,
      onOrdersUpdateAsync: async (order: any): Promise<void> => {
        //console.log(`new or updated order [${order.id}]`);
        orderStore.onOrderUpdate(order, enableKDS, VENUE);
      },
      onNotificationAsync: async (
        message: INotificationMessage,
      ): Promise<void> => {
        if (websocketMessageCallback) {
          websocketMessageCallback(message);
        }
        orderStore.onOrderError(message);
      },
      onAuthFailure: async () => {
        console.log('------------- MANUAL AUTH REQUIRED ----------------- ');
        if (_onAuthFailureCallback) await _onAuthFailureCallback();
      },
      enableKDS,
      onSteeringCommand: onSteeringCommand,
    };
    if (enableKDS) {
      params.onKDSMessageAsync = async (message: any): Promise<void> => {
        //console.log(`MESSAGE  order [${message.id}]`);
        orderStore.onOrderUpdate(message, enableKDS, VENUE);
      };
    }
    const disconnectFn = await listener.connectWebSockets(params);
    resolve(disconnectFn);
  });
}
