
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  NLC_UPLOAD = 'NLC_UPLOAD',
  PURCHASE_ORDERS = 'PURCHASE_ORDERS',
  INVENTORY = 'INVENTORY',
  SALES = 'SALES',
  AI_INSIGHTS = 'AI_INSIGHTS',
  MANAGE_RETAILERS = 'MANAGE_RETAILERS',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  RETAILER_UAM = 'RETAILER_UAM',
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  SETTINGS = 'SETTINGS'
}

export type UserRole = 'ADMIN' | 'RETAILER';
export type RetailerRole = 'OWNER' | 'FLOOR_MANAGER' | 'ACCOUNTANT' | 'SALES_REP';

export interface InvoiceSettings {
  companyName: string;
  addressLine1: string;
  addressLine2: string;
  cityStateZip: string;
  gstin: string;
  logoUrl: string;
  termsAndConditions: string;
  bankDetails: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  retailerId?: string;
  retailerRole?: RetailerRole;
}

export interface AllowedUser {
  email: string;
  role: UserRole;
  retailerId?: string;
  retailerRole?: RetailerRole;
  addedOn: string;
}

export interface RetailerProfile {
  id: string;
  name: string;
  city: string;
  area: string;
  pincode: string;
  showroomAddress: string;
  godownAddress: string;
  creditLimit: number;
  usedCredit: number;
  partnerSharePercent: number;
}

export interface NLCItem {
  id: string;
  manufacturer: string;
  model: string;
  category: string;
  mrp: number;
  basicPrice: number;
  discountSchemes: { name: string; amount: number; isBackend: boolean }[];
  netLandingCost: number; 
  effectiveCost: number;
  msp: number;
  batchDate: string;
  gstRate: number;
  minGrossMarginPercent?: number;
}

export interface InventoryItem {
  id: string;
  serialNumber: string;
  nlcItemId: string; 
  status: 'IN_STOCK' | 'SOLD';
  dateReceived: string;
  retailerId: string;
  retailerPOId?: string;
  consolidatedPOId?: string;
  brandInvoiceId?: string;
  customerInvoiceNumber?: string; // New: For lifecycle tracking
  saleDate?: string; // New: For lifecycle tracking
}

export interface POAttachment {
  id: string;
  name: string;
  type: string;
  url: string; 
  uploadedAt: string;
}

export interface POMappingItem {
  nlcItemId: string;
  orderedQty: number;
  receivedQty: number;
  serialNumbers: string[];
}

export interface PurchaseOrder {
  id: string;
  manufacturer: string;
  date: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'ON_HOLD' | 'CONSOLIDATED' | 'MASTER_ORDERED' | 'SHIPPED' | 'RECEIVED';
  retailerId: string;
  items: { nlcItemId: string; quantity: number; matchedQty?: number }[];
  mappingData?: POMappingItem[];
  masterPOId?: string;
  attachments?: POAttachment[];
  brandInvoiceNumber?: string;
}

export type PaymentMode = 'UPI' | 'CARD' | 'CASH' | 'NET_BANKING' | 'POS_TERMINAL';

export interface Sale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  retailerId: string;
  paymentMode: PaymentMode;
  items: { 
    inventoryId: string; 
    sellingPrice: number; 
    additionalDiscount: number; 
  }[];
  totalAmount: number;
}
