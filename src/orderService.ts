import axios from 'axios';
import { IOrder } from './orderTypes';

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

function handleAPIError(error: any) {
  const { status } = error.response;
  switch (status) {
    case 400:
      console.log('Error: invalid request');
      break;
    case 401:
      console.log('Error: not authenticated');
      break;
    case 500:
      console.log('Error: server problems');
      break;
  }
  throw error;
}
