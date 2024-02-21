import {
  IAuthDataProvider,
  IConfiguredAuthDataProvider,
  IRefreshTokenStorageHandler,
} from './orderTypes';
import {
  INotificationMessage,
  ISteeringCommand,
} from '@orderingstack/ordering-types';

import * as StompJs from '@stomp/stompjs';
import { replaceProtocolInUrl } from './tools';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';
if (typeof TextEncoder !== 'function') {
  const TextEncodingPolyfill = require('text-encoding');
  global.TextEncoder = TextEncodingPolyfill.TextEncoder;
  global.TextDecoder = TextEncodingPolyfill.TextDecoder;
}

export interface ConnectWebSocketsParams {
  baseURL: string;
  tenant: string;
  venue: string;
  authDataProvider: IConfiguredAuthDataProvider;
  //refreshTokenHandler: IRefreshTokenStorageHandler;
  onConnectedAsync: any;
  onDisconnectAsync: any;
  onKDSMessageAsync: any;
  onOrdersUpdateAsync: any;
  onNotificationAsync: any;
  onSteeringCommand?: (message: any) => void;
  onAuthFailure: any;
  enableKDS: boolean;
  extra?: { appInsights?: ApplicationInsights; debugWs?: boolean };
}

/**
 * Create Stomp on websocket connection to Ordering Stack listening for new orders to process by handlers/callback (onMessageAsync)
 */
export async function connectWebSockets(
  params: ConnectWebSocketsParams,
): Promise<() => Promise<void>> {
  const { appInsights, debugWs } = params.extra || {};
  let client: StompJs.Client;
  const baseURL = replaceProtocolInUrl(params.baseURL, 'wss://') + '/websocket';
  let userUUID: string = '';
  const stompConfig: StompJs.StompConfig = {
    brokerURL: baseURL,
    debug: function (a: any) {
      //console.log('DEBUG: ' + a);
    },
    reconnectDelay: 20000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,

    beforeConnect: async function () {
      console.log('--- beforeConnect --- ');
      debugWs &&
        appInsights?.trackTrace({ message: 'websocket beforeConnect' });
      let token = '';
      let UUID = '';
      let tries = 0;
      while (!token && tries <= 8) {
        const data = await params
          .authDataProvider
          // baseURL,
          // params.refreshTokenHandler,
          // false,
          ();
        token = data.token;
        UUID = data.UUID;

        // exponential backoff
        !token && tries++;
        !token && console.warn('WS no token. Exponential backoff');
        !token &&
          debugWs &&
          appInsights?.trackTrace({
            message: 'websocket no token. Exponential backoff',
          });
        !token &&
          (await new Promise((resolve) =>
            setTimeout(resolve, 1000 * Math.pow(2, tries)),
          ));
      }
      if (!token) {
        appInsights?.trackTrace({
          message:
            'websocket Access token provider error - deactivating socket',
        });
        console.error('Access token provider error - deactivating socket');
        client.deactivate();
        if (params.onAuthFailure) params.onAuthFailure();
      }
      stompConfig.connectHeaders = { login: token /*passcode: ''*/ };
      userUUID = UUID;
    },

    onConnect: async function () {
      if (!stompConfig.connectHeaders) return;
      const accessToken = stompConfig.connectHeaders.login;
      await params.onConnectedAsync(accessToken);
      console.log('Websocket connected.');
      if (params.onKDSMessageAsync) {
        var subscription = client.subscribe(
          `/kds/${params.tenant}/${params.venue}`,
          async function (data: any) {
            var message = JSON.parse(data.body);
            await params.onKDSMessageAsync(message);
          },
        );
      }
      if (params.onOrdersUpdateAsync) {
        var subscriptionForOrdersUpdate = client.subscribe(
          `/order-changes/${params.tenant}/${userUUID}`,
          async function (data: any) {
            var message = JSON.parse(data.body) as INotificationMessage;
            await params.onOrdersUpdateAsync(message);
          },
        );
      }
      if (params.onNotificationAsync) {
        var subscriptionForNotifications = client.subscribe(
          `/notifications/${params.tenant}/${userUUID}`,
          async function (data: any) {
            var message = JSON.parse(data.body);
            await params.onNotificationAsync(message);
          },
        );
      }
      if (params.onSteeringCommand && params.venue) {
        client.subscribe(
          `/steering/${params.tenant}/${params.venue}`,
          async function (data: any) {
            var message = JSON.parse(data.body);
            params.onSteeringCommand?.(message as ISteeringCommand);
          },
        );
      }
    },

    onDisconnect: async function () {
      await params.onDisconnectAsync();
      console.log('Websocket disconnected.');
    },

    onStompError: async function (frame: any) {
      // Will be invoked in case of error encountered at Broker
      // Bad login/passcode typically will cause an error
      // Complaint brokers will set `message` header with a brief message. Body may contain details.
      // Compliant brokers will terminate the connection after any error
      console.error(
        'onStompError headers.message: ' + frame?.headers['message'],
      );
      debugWs &&
        appInsights?.trackTrace({
          message:
            'websocket onStompError headers.message: ' +
            frame?.headers['message'],
        });
      console.error('onStompError body: ' + frame.body);
      await client.deactivate();

      client = createNewClient(stompConfig);
      client.activate();
    },
    onWebSocketClose: function () {
      debugWs &&
        appInsights?.trackTrace({
          message: 'websocket closed.',
        });
      console.log('Websocket closed.');
    },
    onWebSocketError: function (error) {
      debugWs &&
        appInsights?.trackTrace({
          message: 'websocket error',
          properties: { error },
        });
      console.log('Websocket error.');
    },
    onUnhandledMessage: function (message) {
      debugWs &&
        appInsights?.trackTrace({
          message: 'websocket onUnhandledMessage',
          properties: { message },
        });
    },
    logRawCommunication: true,
    discardWebsocketOnCommFailure: true,
  };

  try {
    // const { token, UUID } = await params
    //   .authDataProvider
    //   // params.baseURL,
    //   // params.refreshTokenHandler,
    //   // false,
    //   ();
    // stompConfig.connectHeaders = { login: token /*passcode: ''*/ };
    client = createNewClient(stompConfig);
    client.activate();
    return async () => {
      await client.deactivate();
      console.log('Websocket connection deactivated');
    };
  } catch (err) {
    console.error(err);
    return () => Promise.resolve();
  }
}

function createNewClient(stompConfig: any) {
  const _client = new StompJs.Client(stompConfig);
  if (typeof WebSocket !== 'function') {
    // Fallback code
    _client.webSocketFactory = () => {
      const WebSocket = require('ws');
      global.WebSocket = WebSocket;
      //console.log('create ws with ' + stompConfig.brokerURL);
      const ws = new WebSocket(stompConfig.brokerURL);
      return ws;
    };
  }
  return _client;
}
