import axios from 'axios';
import { EOrderLineStatus, IOrder } from './orderTypes';
import {handleAPIError} from './apiTools'

/**
Pulls open orders for venue. Uses provided access token to authenticate to rest api.   
* @param {*} venue - we pull orders for this venue  
* @param {*} token - access token   
 */
export async function pullOrders(
  baseURL: string,
  venue: string,
  token: string,
) {
  console.log('Pulling orders...');
  const response = await axios({
    method: 'get',
    url: `${baseURL}/ordering-api/api/orders/venue/${venue}`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }).catch(handleAPIError);
  if (!response) return [];
  const orders = [];
  for (const o of response.data) {
    if (o.completed) {
      orders.push(o);
    }
  }
  return orders;
}

/**
Pulls open orders for the user. Uses provided access token to authenticate to rest api.   
* @param {*} token - access token   
 */
export async function pullOrdersForUser(baseURL: string, token: string) {
  console.log('Pulling orders for user...');
  const response = await axios({
    method: 'get',
    url: `${baseURL}/ordering-api/api/orders/opened`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  }).catch(handleAPIError);
  if (!response) return [];
  const orders = [];
  for (const o of response.data) {
    if (o.completed) {
      orders.push(o);
    }
  }
  return orders;
}

export async function updateCentrallyOrderExtraAttr(
  baseURL: string,
  token: string,
  orderId: string,
  store: string,
) {
  let result;
  result = await axios({
    method: 'POST',
    url: `${baseURL}/ordering-api/api/order/${orderId}/extra`,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      store,
    },
  }).catch(handleAPIError);
  return result ? true : false;
}

export async function postNewOrder(
  baseURL: string,
  token: string,
  order: IOrder,
) {
  const response = await axios({
    method: 'post',
    url: `${baseURL}/ordering-api/api/order/new`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: order,
  }).catch(handleAPIError);
  return response ? response.data : null;
}

export async function createOrderPayment(
  baseURL: string,
  token: string,
  orderId: string,
  paymentType: number,
  amount: number,
  returnUrl: string,
  returnErrorUrl: string,
  source: string,
) {
  const data = {
    orderId,
    paymentType,
    amount,
    returnUrl,
    returnErrorUrl,
    source,
  };
  const response = await axios({
    method: 'post',
    url: `${baseURL}/payment-api/create`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data,
  }).catch(handleAPIError);
  return response ? response.data : null;
}

export async function addOrderContactData(
  baseURL: string,
  token: string,
  orderId: string,
  name?: string,
  phone?: string,
  email?: string,
) {
  const data = {
    name,
    phone,
    email,
  };

  const response = await axios({
    method: 'post',
    url: `${baseURL}/ordering-api/api/order/${orderId}/contact`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data,
  }).catch(handleAPIError);
  return response ? response.data : null;
}

export async function appendOrderLine(
  baseURL: string,
  token: string,
  orderId: string,
  venueId: string,
  productId: string,
  price: number,
  quantity: number,
  status: EOrderLineStatus = EOrderLineStatus.NEW,
  productConfig?: any,
  comment?: string,
  extra?: any,
) {
  const data = {
    venue: venueId,
    lines: [
      {
        productId,
        price,
        quantity,
        status,
        productConfig,
        comment,
        extra,
      },
    ],
  };
  const response = await axios({
    method: 'post',
    url: `${baseURL}/ordering-api/api/order/${orderId}/append`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data,
  }).catch(handleAPIError);
  return response ? response.data : null;
}


