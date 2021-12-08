import {
  cmdOrderCreate,
  getOrderStore,
  clearOrderStore,
  onOrderUpdate,
  onOrderError,
} from '../orderStore';

import { OrderRecHashmap } from '../orderStore';
import { orderServerTool } from '../__mocks__/orderServerToolMock';
import { authDataProvider } from '../__mocks__/authDataProvider';
import { EOrderType, EOrderStatus, EOrderRecStatus } from '../orderTypes';

const ctx = {};

test('create order should add new key to orders map', async () => {
  const { id, correlationId } = await cmdOrderCreate(
    ctx,
    authDataProvider,
    orderServerTool,
  );
  expect(id).toBe('order1');
  expect(correlationId).toBe('corelation1');
  const orderStore: OrderRecHashmap = getOrderStore();
  const rec = orderStore['order1'];
  expect(rec).not.toBeNull();
  expect(rec.recStatus).toBe(EOrderRecStatus.INITIALIZING);
});

test('invocation of onOrderUpdate (new id) should update orders map', () => {
  onOrderUpdate(
    {
      id: 'order1002',
      tenant: 'tenant1',
      orderType: EOrderType.DELIVERY,
      status: EOrderStatus.NEW,
      created: new Date('2021-01-01'),
      total: 501,
      buckets: [],
    },
    false,
    'restaurant1',
  );
  const orderStore: OrderRecHashmap = getOrderStore();
  const rec = orderStore['order1002'];
  expect(rec).not.toBeNull();
  expect(rec.recStatus).toBe(EOrderRecStatus.VALID);
});

test('create order, then notification with error -> proper state', async () => {
  const { id, correlationId } = await cmdOrderCreate(
    ctx,
    authDataProvider,
    orderServerTool,
  );
  expect(id).toBe('order2');
  expect(correlationId).toBe('corelation2');
  onOrderError({
    id: 'order2',
    message: 'Unknown error',
  });
  const orderStore: OrderRecHashmap = getOrderStore();
  const rec = orderStore['order2'];
  expect(rec).not.toBeNull();
  expect(rec.recStatus).toBe(EOrderRecStatus.INVALID);
});

test('create order, update and update with close=true, should add and finaly remove item in the orders map', async () => {
  clearOrderStore();
  const { id } = await cmdOrderCreate(ctx, authDataProvider, orderServerTool);
  expect(id).toBe('order3');
  const orderStore: OrderRecHashmap = getOrderStore();
  const rec = orderStore['order3'];
  expect(rec).not.toBeNull();
  expect(Object.keys(orderStore).length).toBe(1);
  onOrderUpdate(
    {
      id: 'order3',
      tenant: 'tenant1',
      orderType: EOrderType.DELIVERY,
      status: EOrderStatus.NEW,
      created: new Date('2021-01-01'),
      total: 501,
      closed: true,
      buckets: [],
    },
    false,
    'restaurant1',
  );
  expect(Object.keys(orderStore).length).toBe(0);
});

test('filter orders by venue in kds mode', () => {
  clearOrderStore();
  onOrderUpdate(
    {
      id: 'order3001',
      tenant: 'tenant1',
      orderType: EOrderType.DELIVERY,
      status: EOrderStatus.NEW,
      created: new Date('2021-01-01'),
      total: 501,
      buckets: [{ venue: 'v1' }, { venue: 'v2' }],
    },
    true,
    'v1',
  );
  const orderStore: OrderRecHashmap = getOrderStore();
  const rec = orderStore['order3001'];
  expect(rec).not.toBeNull();
  expect(rec.recStatus).toBe(EOrderRecStatus.VALID);
});

test('filter orders by venue in kds mode - negative variant', () => {
  clearOrderStore();
  onOrderUpdate(
    {
      id: 'order3',
      tenant: 'tenant1',
      orderType: EOrderType.DELIVERY,
      status: EOrderStatus.NEW,
      created: new Date('2021-01-01'),
      total: 501,
      closed: true,
      buckets: [{ venue: 'v1' }],
    },
    true,
    'v2',
  );
  const orderStore: OrderRecHashmap = getOrderStore();
  expect(Object.keys(orderStore).length).toBe(0);
});
