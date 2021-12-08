import {
  EOrderRecStatus,
  IAuthDataProvider,
  IOrder,
  IOrderRec,
  IOrderServerTool,
} from './orderTypes';

export interface OrderRecHashmap {
  [id: string]: IOrderRec;
}

let orderRecords: OrderRecHashmap = {}; //TODO prune old orders
let orderUpdateCallback: Function;

export const setOrderStoreUpdatedCallback = (_callback: Function) => {
  orderUpdateCallback = _callback;
};

export const cmdOrderCreate = async (
  ctx: any,
  authDataProvider: IAuthDataProvider,
  orderServerTool: IOrderServerTool,
): Promise<{ id: string; correlationId: string }> => {
  const { id, correlationId } = await orderServerTool.createOrder(
    ctx,
    authDataProvider,
  );
  if (orderRecords[id]) {
    // order already exists, order update or error notification came ealier then REST reponse from create
    // do nothing
  } else {
    orderRecords[id] = {
      createOrderCorrelationId: correlationId,
      recStatus: EOrderRecStatus.INITIALIZING,
    };
  }
  if (orderUpdateCallback) orderUpdateCallback(orderRecords[id], orderRecords);
  return { id, correlationId };
};

export const onOrderUpdate = (
  orderData: any,
  isKDS: boolean,
  venueId: string,
) => {
  const id = orderData.id;
  if (!id) return;
  if (isKDS) {
    const orderVenues: string[] = orderData.buckets?.map((b: any) => b.venue);
    if (!orderVenues?.includes(venueId)) {
      return;
    }
  }
  //console.log('-------- onOrderUpdate ' + id);
  if (!orderRecords[id]) {
    if (orderData.closed) return;
    // create new record
    orderRecords[id] = {
      recStatus: EOrderRecStatus.VALID,
      order: toOrder(orderData),
      createOrderCorrelationId: '',
    };
  } else {
    // update
    const rec = orderRecords[id];
    if (rec.recStatus === EOrderRecStatus.INITIALIZING) {
      rec.recStatus = EOrderRecStatus.VALID;
    }
    rec.order = toOrder(orderData);
    if (rec.order.closed) {
      //console.log('---------------------- CLOSED:  ' + id);
      delete orderRecords[id];
    }
    //if (rec.recStatus === EOrderRecStatus.INVALID) {
    // ????
    //}
  }
  // console.log(
  //   `Order Store contains ${Object.keys(orderRecords).length} records`,
  // );
  if (orderUpdateCallback) orderUpdateCallback(orderRecords[id], orderRecords);
};

export const onOrderError = (errorMsg: any) => {
  const id = errorMsg.id;
  if (!id) return;
  if (!orderRecords[id]) {
    //error while creating order (there were no order update messages)
    orderRecords[id] = {
      recStatus: EOrderRecStatus.INVALID,
      createOrderCorrelationId: '',
    };
    if (orderUpdateCallback)
      orderUpdateCallback(orderRecords[id], orderRecords);
  } else {
    const rec = orderRecords[id];
    if (rec.createOrderCorrelationId === errorMsg.correlationId) {
      rec.recStatus = EOrderRecStatus.INVALID;
      return;
    }
    if (rec.recStatus === EOrderRecStatus.INITIALIZING) {
      rec.recStatus = EOrderRecStatus.INVALID;
    }
    // notifications or errors for existing (created orders)
    // do nothing
  }
};

export const getOrderStore = (): OrderRecHashmap => orderRecords;
export const clearOrderStore = (): void => {
  orderRecords = {};
};

function toOrder(orderData: any): IOrder {
  const order: IOrder = orderData;
  // const order: IOrder = {
  //   id: orderData.id,
  //   tenant: orderData.tenant,
  //   orderType: orderData.orderType,
  //   created: orderData.created,
  //   status: orderData.status,
  //   buckets: orderData.buckets,
  //   closed: orderData.closed,
  //   users:orderData.users,
  // };
  return order;
}
