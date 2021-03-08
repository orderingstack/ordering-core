import {
  EOrderStatus,
  EOrderType,
  IAuthDataProvider,
  IOrder,
  IOrderRec,
  IOrderServerTool,
} from '../orderTypes';

let lastOrderId = 1;

export const orderServerTool: IOrderServerTool = {
  createOrder: async (
    ctx: any,
    tokenProvider: IAuthDataProvider,
  ): Promise<{ id: string; correlationId: string }> => {
    const retVal = {
      id: `order${lastOrderId}`,
      correlationId: `corelation${lastOrderId}`,
    };
    lastOrderId++;
    return retVal;
  },
  fetchOrder: (ctx: any, id: string, tokenProvider: IAuthDataProvider) => {
    const order: IOrder = {
      id,
      tenant: 'tenant1',
      orderType: EOrderType.DELIVERY,
      status: EOrderStatus.NEW,
      created: new Date('2021-01-01'),
      buckets: [],
    };
    return order;
  },
};
