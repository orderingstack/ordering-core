import { IAuthDataProvider, IRefreshTokenHandler } from './orderTypes';

import * as StompJs from '@stomp/stompjs';
import { replaceProtocolInUrl } from './tools';
if (typeof TextEncoder !== 'function') {
  const TextEncodingPolyfill = require('text-encoding');
  global.TextEncoder = TextEncodingPolyfill.TextEncoder;
  global.TextDecoder = TextEncodingPolyfill.TextDecoder;
}

export interface ConnectWebSocketsParams {
  baseURL: string;
  tenant: string;
  venue: string;
  authDataProvider: IAuthDataProvider;
  refreshTokenHandler: IRefreshTokenHandler;
  onConnectedAsync: any;
  onDisconnectAsync: any;
  onKDSMessageAsync: any;
  onOrdersUpdateAsync: any;
  onNotificationAsync: any;
  onAuthFailure: any;
}

/**
 * Create Stomp on websocket connection to Ordering Stack listening for new orders to process by handlers/callback (onMessageAsync)
 *
 * @param {*} tenant
 * @param {*} venue
 * @param {*} accessTokenProviderCallbackAsync function called before connecting to STOMP server. Should return access token.
 * @param {*} onConnectedAsync async function (accessToken) {....}
 * @param {*} onDisconnectAsync
 * @param {*} onMessageAsync async function (message, accessToken) {....}
 */
export async function connectWebSockets(params: ConnectWebSocketsParams) {
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
      //console.log('--- beforeConnect --- ');
      const { token, UUID } = await params.authDataProvider(
        baseURL,
        params.refreshTokenHandler,
        false,
      );
      if (!token) {
        //console.error('Access token provider error - deactivating socket');
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
      //console.log('Websocket connected.');
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
            var message = JSON.parse(data.body);
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
    },

    onDisconnect: async function () {
      await params.onDisconnectAsync();
      //console.log('Websocket disconnected.');
    },

    onStompError: async function (frame: any) {
      // Will be invoked in case of error encountered at Broker
      // Bad login/passcode typically will cause an error
      // Complaint brokers will set `message` header with a brief message. Body may contain details.
      // Compliant brokers will terminate the connection after any error
      //console.error('Broker reported error: ' + frame.headers['message']);
      //console.error('Additional details: ' + frame.body);
      await client.deactivate();

      client = createNewClient(stompConfig);
      client.activate();
    },
    onWebSocketClose: function () {
      //console.log('Websocket closed.');
    },
    onWebSocketError: function () {
      //console.log('Websocket error.');
    },
    onUnhandledMessage: function () {},
    logRawCommunication: true,
    discardWebsocketOnCommFailure: true,
  };

  try {
    const { token, UUID } = await params.authDataProvider(
      params.baseURL,
      params.refreshTokenHandler,
      false,
    );
    stompConfig.connectHeaders = { login: token /*passcode: ''*/ };
    client = createNewClient(stompConfig);
    client.activate();
  } catch (err) {
    console.error(err);
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
