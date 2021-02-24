import axios from 'axios';

/**
Pulls open orders for venue. Uses provided access token to authenticate to rest api.   
* @param {*} venue - we pull orders for this venue  
* @param {*} token - access token   
 */
export async function pullOrders(ctx: any, venue: string, token: string) {
  console.log('Pulling orders...');
  let response = null;
  try {
    response = await axios({
      method: 'get',
      url: `${ctx.BASE_URL}/ordering-api/api/orders/venue/${venue}`,
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
  ctx: any,
  token: string,
  orderId: string,
  store: string,
) {
  let result;
  try {
    result = await axios({
      method: 'POST',
      url: `${ctx.BASE_URL}/ordering-api/api/order/${orderId}/extra`,
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

export async function postNewOrder(ctx: any, token: string, order: string) {
  const response = await axios({
    method: 'post',
    url: `${ctx.BASE_URL}/ordering-api/api/order/new`,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data: order,
  });
  return response.data;
}
