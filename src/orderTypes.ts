export interface IUser {
  userId: string;
  roles: string[];
  name?: string;
  phone?: string;
  email?: string;
  extra?: IExtra;
}

export enum EOrderType {
  TAKE_AWAY,
  DELIVERY,
  DINE_IN,
  DINE_IN_OPEN,
}

export enum EOrderStatus {
  NEW,
  COMPLETED,
  DELIVER,
}
export enum EOrderLineStatus {
  NEW,
  CONFIRMED,
}

export enum EOrderPaymentType {
  CASH,
  COD,
  EPAYMENT,
}

export interface IOrder {
  id: string;
  tenant: string;
  created: Date;
  lastChanged?: Date;
  completedTime?: Date;
  closedDate?: Date;
  processingStartedTime?: Date;
  deliveredTime?: Date;
  due?: Date;
  deliveryAddress?: IOrderDeliveryAddress;
  geoPosition?: {
    lat: number;
    lng: number;
  };
  source?: string;
  users?: IUser;
  orderType: EOrderType;
  total?: number;
  editTotal?: number;
  status: EOrderStatus;
  statusInfo?: string;
  closed?: boolean;
  completed?: boolean;
  claimCode?: string;
  buckets: IOrderInBucket[];
  loyaltyId?: string;
  coupons?: IOrderCoupon[];
  payments?: IOrderPayment[];
  comments?: IOrderComment[];
}

export interface IOrderInBucket {
  venue: string;
  name: string;
  menu: string;
  lines: IOrderLine[];
  priceList?: string;
  warehouse?: string;
  queuePos?: number;
  extra?: IExtra;
}

export interface IOrderLine {
  id: string;
  creator: string;
  created: Date;
  updated: Date;
  source: string;
  quantity: number;
  price: number;
  productId: string;
  product: IOrderProduct;
  extra: IExtra;
}

export interface IOrderProduct {
  id: string;
  kind: string;
  literals: IProductLiterals;
  items: IOrderProduct[];
  img: string;
  quantity: number;
  price: number;
  extra: IExtra;
}

export interface IProductLiterals {
  [propName: string]: any;
}

export interface IExtra {
  [propName: string]: any;
}

export interface IOrderCoupon {
  coupon: string;
}

export interface IOrderPayment {
  id: string;
  type: EOrderPaymentType;
  source: string;
  amount: number;
  initialAmount: number;
  user: string;
  timestamp: Date;
  extra: IExtra;
}

export interface IOrderComment {
  id: string;
  creator: string;
  timestamp: Date;
  comment: string;
  extra?: IExtra;
}

export interface IOrderDeliveryAddress {
  street: string;
  number: string;
  door: string;
  postal: string;
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
  getRefreshToken(tenant: string): string;
  setRefreshToken(tenant: string, refreshToken: string): void;
  clearRefreshToken(tenant: string): void;
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
  ():  Promise<{
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
