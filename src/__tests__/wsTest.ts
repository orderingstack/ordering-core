import { IAuthDataProvider, IRefreshTokenHandler } from './../orderTypes';
import * as listener from './../wsListener';
import { Server } from 'mock-socket';

xtest('ws connect', async () => {
  const fakeURL = 'wss://ordering.3e.pl';
  const mockServer = new Server(fakeURL + '/websocket');

  mockServer.on('connection', (socket) => {
    socket.on('message', (data) => {
      console.log(data);
      socket.send('test message from mock server');
    });
  });

  const refreshTokenHandler: IRefreshTokenHandler = {
    getRefreshToken: () => {
      return 'refresh_token';
    },
    setRefreshToken: (r) => {},
  };

  const ctx: any = {
    TENANT: 'aaa',
    VENUE: 'bbb',
    BASE_URL: fakeURL,
  };

  const params: listener.ConnectWebSocketsParams = {
    ctx,
    tenant: ctx.TENANT,
    venue: ctx.VENUE,
    authDataProvider: authDataProvider,
    refreshTokenHandler,
    onConnectedAsync: async (accessToken: any): Promise<any> => {
      console.log('ws connected!');
    },
    onDisconnectAsync: async (): Promise<void> => {
      console.log('ws disconnected');
      //webSocketConnected = false;
    },
    onKDSMessageAsync: async (message: any): Promise<void> => {
      // we have new message
      console.log(`new or updated order [${message.id}]`);
    },
    onOrdersUpdateAsync: async (order: any): Promise<void> => {},
    onNotificationAsync: async (message: any): Promise<void> => {
      console.log(`NOTIFICATION: ${JSON.stringify(message)}`);
    },
    onAuthFailure: async () => {},
  };
  await listener.connectWebSockets(params);
});

const authDataProvider: IAuthDataProvider = async (
  ctx: any,
  refreshTokenProvider,
  forceRefresh?: boolean,
) => {
  return { token: 'aaa', UUID: 'user1' };
};

async function initWSForTest(baseURL: string) {
  // listener is responsible for receiving orders from Ordering Stack
}
