export interface IUser {
  userId: string;
  roles: string[];
  name?: string;
  phone?: string;
  email?: string;
  extra?: IExtra;
}

export enum EOrderType {
  TAKE_AWAY = "TAKE_AWAY",
  DELIVERY = "DELIVERY",
  DINE_IN = "DINE_IN",
  DINE_IN_OPEN = "DINE_IN_OPEN",
}

// https://docs.orderingstack.com/order/
export enum EOrderStatus {
  NEW = "NEW",
  COMPLETED = "COMPLETED", // Payments === total
  VERIFIED = "VERIFIED", // auto or manually set when conditions are met i.e fiscalization
  DELIVER = "DELIVER", // all lines have final state
  DELIVERED = "DELIVERED",
  CLOSED = "CLOSED",
  ABANDONED = "ABANDONED",
  CANCELLED = "CANCELLED",
  PICKED_UP = "PICKED_UP", // order given to the courier e.g. glovo driver

}
export enum EOrderLineStatus {
  NEW = "NEW",
  CONFIRMED = "CONFIRMED",
}

export enum EOrderPaymentType {
  CASH = "CASH",
  COD = "COD",
  EPAYMENT = "EPAYMENT",
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
  users?: IUser[];
  orderType: EOrderType;
  total?: number;
  editTotal?: number;
  status: EOrderStatus;
  statusInfo?: string;
  closed?: boolean;
  completed?: boolean;
  verified?: boolean;
  claimCode?: string;
  buckets: IOrderInBucket[];
  loyaltyId?: string;
  coupons?: IOrderCoupon[];
  payments?: IOrderPayment[];
  comments?: IOrderComment[];
  extra?: IOrderExtra;
}

export enum EOrderSource {
  KIOSK = "KIOSK",
  WEB = "WEB",
  JUST_EAT_TAKE_AWAY = "JUSTEATTAKEAWAY",
  GLOVO = "GLOVO",
  PYSZNE = "PYSZNE"
}

/**
 * IOrderExtra interface
 *
 * @interface IOrderExtra
 * @manual-verify {string} order needs manual verification
 * @collect-time {string} estimated pickup time from aggregator
 * @courier-name {string} courier name from aggregator
 * @courier-phone {string} courier phone from aggregator
 * @customer-name {string} customer name from aggregator
 * @customer-phone {string} customer phone from aggregator
 * @requiresVatInvoice {boolean}
 * @allergies {string} customer allergies from aggregator
 * @x-agg-id {string} order ID from aggregator
 */
export interface IOrderExtra {
  "x-source"?: EOrderSource;
  "x-source-type"?: "INTEGRATOR",
  "manual-verify"?: string;
  "collect-time"?: string;
  "courier-name"?: string;
  "courier-phone"?: string;
  "customer-name"?: string;
  "customer-phone"?: string;
  requiresVatInvoice?: boolean;
  allergies?: string;
  'x-agg-id'?: string
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
  hash: string;
  updated: Date;
  source: string;
  status: EOrderStatus;
  quantity: number;
  price: number;
  productId: string;
  product: IOrderProduct;
  productConfig: IProductConfig;
  extra: IExtra;
  total: number;
  // TODO find discounts structure
  discounts: any[];
}

export enum EOrderProductKind {
  GROUP = "group",
  PRODUCT = "product",
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
};

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
  getRefreshToken(tenant: string): Promise<string>|string;
  setRefreshToken(tenant: string, refreshToken: string): Promise<void>|void;
  clearRefreshToken(tenant: string): Promise<void>|void;
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
