
export enum Category {
  PANE = 'Pane',
  DOLCI = 'Dolci',
  BEVANDE = 'Bevande',
  SALATO = 'Salato',
  CAFFETTERIA = 'Caffetteria'
}

export enum VatRate {
  ZERO = 0,
  FOUR = 4,
  TEN = 10,
  TWENTY_TWO = 22
}

export enum Unit {
  PIECE = 'pz',
  KG = 'kg',
  LITRE = 'l'
}

export interface ProductVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number; // Final price including VAT
  vatRate: VatRate;
  plu: string;
  active: boolean;
  unit: Unit;
  stock: number;
  variants?: {
    sizes?: ProductVariant[];
    flavors?: ProductVariant[];
    additions?: ProductVariant[];
  };
}

export enum PaymentMethod {
  CASH = 'Contanti',
  CARD = 'Carta/POS',
  BANCOMAT = 'Bancomat',
  CONTACTLESS = 'Contactless',
  TICKET = 'Buoni Pasto',
  MIXED = 'Misto'
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  vatRate: VatRate;
  variantSelections?: {
    size?: ProductVariant;
    flavor?: ProductVariant;
    additions?: ProductVariant[];
  };
  discount?: {
    type: 'percent' | 'fixed';
    value: number;
  };
}

export interface VatBreakdown {
  rate: number;
  taxable: number;
  vatAmount: number;
}

export enum SaleStatus {
  COMPLETED = 'Completato',
  VOIDED = 'Annullato',
  RETURNED = 'Reso'
}

export interface Sale {
  id: string;
  items: CartItem[];
  total: number;
  vatTotal: number;
  subtotal: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  operator: string;
  receiptNumber: number;
  amountPaid?: number;
  changeGiven?: number;
  vatBreakdown: VatBreakdown[];
  status: SaleStatus;
  discountAmount?: number;
}

export enum UserRole {
  CASHIER = 'Cassiere',
  MANAGER = 'Manager',
  ADMIN = 'Amministratore'
}

export interface Operator {
  id: string;
  name: string;
  role: UserRole;
}

export interface ClosureReport {
  id: string;
  timestamp: Date;
  operator: string;
  totalSales: number;
  netSales: number;
  totalVat: number;
  receiptCount: number;
  byCategory: Record<string, number>;
  byPaymentMethod: Record<string, number>;
  theoreticalCash: number;
  realCash: number;
  difference: number;
  vatBreakdown: VatBreakdown[];
  sentToAgency: boolean;
}

export interface CashSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  startingBalance: number;
  endingBalance?: number;
  operator: string;
  isOpen: boolean;
}
