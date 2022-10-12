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
  GLOVO_DELIVERY = "GLOVO_DELIVERY",
  GLOVO_TAKE_AWAY = "GLOVO_TAKE_AWAY",
  JUSTEAT_DELIVERY = "JUSTEAT_DELIVERY",
  JUSTEAT_TAKE_AWAY = "JUSTEAT_TAKE_AWAY"
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
  TECHNICAL = "TECHNICAL",
  CONFIRMED = "CONFIRMED",
  PROCESSING = "PROCESSING",
  PROCESSED = "PROCESSED",
  VOID = "VOID",
  WASTE = "WASTE"
}

export enum EOrderPaymentType {
  CASH = "CASH",
  CARD = "CARD",
  COD = "COD",
  TERMINAL = "TERMINAL",
  EPAYMENT = "EPAYMENT",
  COUPON = "COUPON",
  WALLET= "WALLET",
  PREAUTHORIZED = "PREAUTHORIZED",
  RETURN = "RETURN",
  EXTERNAL = "EXTERNAL"
}



export interface IOrder {
  tenant: string;
  id: string;
  extId?: string;
  created: string;
  due?: string;
  closedDate?: string;
  lastChanged?: string;
  completedTime?: string;
  verifiedTime?: string;
  processingStartedTime?: string;
  deliveredTime?: string;
  source: string;
  users?: IUser[];
  loyaltyId?: string;
  coupons?: IOrderCoupon[];
  orderType: EOrderType;
  deliveryAddress?: IOrderDeliveryAddress;
  geoPosition?: {
    lat: number;
    lng: number;
  };
  total: number;
  editTotal: number;
  status: EOrderStatus;
  statusInfo?: string;
  comments?: IOrderComment[];
  claimCode?: string;
  buckets: IOrderInBucket[];
  payments?: IOrderPayment[];
  fiscal?: IOrderFiscal[];
  tax: ITaxSummary[];
  extra?: IOrderExtra;
  traces?: {
    [propName: string]: string
  }
  logs?: IOrderLog[];
  locked?: boolean;
  completed?: boolean;
  verified?: boolean;
  closed?: boolean;
}

export interface IOrderLog {
  timestamp?: string;
  user?: string
  ip?: string;
  message?: string;
  lines?: string[]
}

export interface ITaxSummary {
  rate: string;
  confirmed?: boolean;
  netto: number;
  tax: number;
  brutto: number
}

export interface IOrderFiscal {
  timestamp: string;
  user?: string;
  venue?: string;
  amount: number;
  printer: string;
  slip: string;
  taxId?: string;
  message?: string;
  entries: ISlipEntry[];
  payments?: {
    [propName: string]: number
  };
  subTotalDiscounts?: ISubTotalDiscount[];
  extra: {
    [propName: string]: number
  }
}

export interface ISlipEntry {
  item: string;
  qty: number;
  price: number;
  discount?: number;
  total: number;
  vat: string
}

export interface ISubTotalDiscount {
  name: string;
  discount: number;
  vat: string
}

export enum EOrderSource {
  KIOSK = "KIOSK",
  WEB = "WEB",
  JUST_EAT_TAKE_AWAY = "JUSTEATTAKEAWAY",
  GLOVO = "GLOVO",
  PYSZNE = "PYSZNE",
  WOLT = "WOLT",
  UBER = "UBER"
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
  requiresVatInvoice?: string;
  allergies?: string;
  'x-agg-id'?: string
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
  sync: boolean,
  syncId: string,
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
  comments?: IOrderComment[]
  discounts?: IDiscount[];
  extra: IExtra;
  hash: string;
  total: number;
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
