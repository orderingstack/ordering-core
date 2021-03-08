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
  let response = null;
  try {
    response = await axios({
      method: 'get',
      url: `${baseURL}/ordering-api/api/orders/venue/${venue}`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const orders = [];
    for (const o of response.data) {
      if (o.completed) {
        orders.push(o);
      }
    }
    return orders;
  } catch (error) {
    console.error(error);
    return [];
  }
}

/**
Pulls open orders for the user. Uses provided access token to authenticate to rest api.   
* @param {*} token - access token   
 */
export async function pullOrdersForUser(baseURL: string, token: string) {
  console.log('Pulling orders for user...');
  let response = null;
  try {
    response = await axios({
      method: 'get',
      url: `${baseURL}/ordering-api/api/orders/opened`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const orders = [];
    for (const o of response.data) {
      if (o.completed) {
        orders.push(o);
      }
    }
    return orders;
  } catch (error) {
    console.error(error);
    return [];
  }
}

export async function updateCentrallyOrderExtraAttr(
  baseURL: string,
  token: string,
  orderId: string,
  store: string,
) {
  let result;
  try {
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
    });
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
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
  });
  return response.data;
}
