export {
  IOrder,
  EOrderStatus,
  EOrderLineStatus,
  EOrderType,
  EOrderSource,
  EOrderPaymentType,
} from '@orderingstack/ordering-types';
import {
  IOrder,
  EOrderLineStatus,
  EOrderPaymentType,
} from '@orderingstack/ordering-types';

export interface IUser {
  userId: string;
  roles: string[];
  name?: string;
  phone?: string;
  email?: string;
  extra?: IExtra;
}

export interface IDiscount {
  layer: string;
  name?: string;
  discountPrice: number;
  type: string;
  product: string;
  path?: string;
  price: number;
}

export interface IOrderInBucket {
  venue: string;
  sync: boolean;
  syncId: string;
  name: string;
  menu: string;
  lines: IOrderLine[];
  priceList?: string;
  warehouse?: string;
  queuePos?: string;
  extra?: IExtra;
}

export interface IOrderLine {
  id: string;
  creator?: string;
  created: string;
  updated: string;
  source: string;
  quantity: number;
  price: number;
  productId: string;
  product: IOrderProduct;
  productConfig: IProductConfig;
  bom: Object;
  status: EOrderLineStatus;
  comments?: IOrderComment[];
  discounts?: IDiscount[];
  extra: IExtra;
  hash: string;
  total: number;
}

export enum EOrderProductKind {
  GROUP = 'group',
  PRODUCT = 'product',
}

export interface IOrderProduct {
  id: string;
  kind: EOrderProductKind;
  literals: IProductLiterals;
  items?: IOrderProduct[];
  img: string;
  quantity: number;
  price: number;
  extra: IExtra;
}

export interface IProductConfig {
  selected: any;
  filter: any;
}

export interface IProductLiterals {
  [propName: string]: any;
}

export interface IExtra {
  [propName: string]: any;
}

export interface IOrderCoupon {
  coupon: string;
  addedAt: string;
  addedBy: string;
}

export interface IOrderPayment {
  id: string;
  type: EOrderPaymentType;
  source: string;
  amount: number;
  initialAmount?: number;
  user: string;
  timestamp?: string;
  extra?: IExtra;
}

export interface IOrderComment {
  id: string;
  creator: string;
  timestamp?: string;
  comment: string;
  extra?: IExtra;
}

export interface IOrderDeliveryAddress {
  street: string;
  number: string;
  door?: string;
  postal?: string;
  city: string;
  country: string;
}

export enum EOrderRecStatus {
  INITIALIZING,
  INVALID,
  VALID,
}

export interface IOrderRec {
  order?: IOrder;
  createOrderCorrelationId: string;
  recStatus: EOrderRecStatus;
}

export interface IRefreshTokenStorageHandler {
  getRefreshToken(tenant: string): Promise<string> | string;
  setRefreshToken(tenant: string, refreshToken: string): Promise<void> | void;
  clearRefreshToken(tenant: string): Promise<void> | void;
}

export interface IEditableUserData {
  firstName?: string;
  phone?: string;
  pushId?: string;
}

export interface IAuthData {
  expires_in: string;
  access_token: string;
  UUID: string;
  refresh_token: string;
}

export interface IAuthDataProvider {
  (
    ctx: any,
    getRefreshToken: IRefreshTokenStorageHandler,
    forceRefresh?: boolean,
  ): Promise<{
    token: string;
    UUID: string;
  }>;
}

export interface IConfiguredAuthDataProvider {
  (): Promise<{
    token: string;
    UUID: string;
  }>;
}

export interface IOrderServerTool {
  createOrder(
    ctx: any,
    tokenProvider: IAuthDataProvider,
  ): Promise<{ id: string; correlationId: string }>;
  fetchOrder(ctx: any, id: string, tokenProvider: IAuthDataProvider): IOrder;
}
