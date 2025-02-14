import {
  IAuthDataProvider,
  IConfiguredAuthDataProvider,
  IOrderRec,
  IRefreshTokenStorageHandler,
} from './orderTypes';
import * as listener from './wsListener';
import * as orderService from './orderService';
import * as orderStore from './orderStore';
import {
  INotificationMessage,
  ISteeringCommand,
} from '@orderingstack/ordering-types';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { OrderRecHashmap } from './orderStore';

export function orderChangesListener(
  BASE_URL: string,
  TENANT: string,
  VENUE: string,
  authDataProvider: IConfiguredAuthDataProvider,
  //refreshTokenHandler: IRefreshTokenStorageHandler,
  onOrderUpdatedCallback: (
    orderRec: IOrderRec | undefined,
    orders: OrderRecHashmap,
  ) => void,
  _onAuthFailureCallback: () => Promise<void>,
  enableKDS: boolean,
  websocketMessageCallback?: (message: INotificationMessage) => void,
  onSteeringCommand?: (message: ISteeringCommand) => void,
  extra?: {
    appInsights?: ApplicationInsights;
    debugWs?: boolean;
    onlyCompletedOrdersForUser?: boolean;
    onWebsocketConnected?: (status: boolean) => void;
  },
): Promise<() => Promise<void>> {
  const { appInsights, debugWs, onlyCompletedOrdersForUser } = extra || {};
  return new Promise(async (resolve, reject) => {
    orderStore.setOrderStoreUpdatedCallback(onOrderUpdatedCallback);
    const params: listener.ConnectWebSocketsParams = {
      baseURL: BASE_URL,
      tenant: TENANT,
      venue: VENUE,
      authDataProvider: authDataProvider,
      onConnectedAsync: async (accessToken: any): Promise<any> => {
        console.log('Websocket connected async');
        debugWs &&
          appInsights?.trackTrace({ message: 'websocket connected async' });
        extra?.onWebsocketConnected?.(true);
        let orders;
        if (!enableKDS) {
          // pulls ONLY open orders
          orders = await orderService.pullOrdersForUser(
            BASE_URL,
            accessToken,
            onlyCompletedOrdersForUser,
          );
        } else {
          // KDS version
          // pulls ONLY open orders
          orders = await orderService.pullOrders(BASE_URL, VENUE, accessToken);
        }
        orderStore.onUpdateAllOrders(orders, enableKDS, VENUE, appInsights);

        // for (const order of orders) {
        //   // this leads to hanging orders on KDS, if order was closed during websocket offline it will never we removed from store
        //   orderStore.onOrderUpdate(order, enableKDS, VENUE);
        // }
      },
      onDisconnectAsync: async (): Promise<void> => {
        console.log('websocket disconnected');
        debugWs &&
          appInsights?.trackTrace({ message: 'websocket disconnected' });
      },
      onKDSMessageAsync: null,
      onOrdersUpdateAsync: async (order: any): Promise<void> => {
        debugWs &&
          appInsights?.trackTrace({
            message: 'websocket onOrdersUpdateAsync',
            properties: { order },
          });
        //console.log(`new or updated order [${order.id}]`);
        orderStore.onOrderUpdate(order, enableKDS, VENUE);
      },
      onNotificationAsync: async (
        message: INotificationMessage,
      ): Promise<void> => {
        debugWs &&
          appInsights?.trackTrace({
            message: 'websocket onNotificationAsync',
            properties: { message },
          });
        if (websocketMessageCallback) {
          websocketMessageCallback(message);
        }
        orderStore.onOrderError(message);
      },
      onAuthFailure: async () => {
        console.log('------------- MANUAL AUTH REQUIRED ----------------- ');
        debugWs &&
          appInsights?.trackTrace({
            message: 'websocket onAuthFailure',
          });
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
