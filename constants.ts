
import { Category, Product, VatRate, Unit, UserRole, Operator } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  // Existing
  { id: 'p1', name: 'Pane di Altamura', category: Category.PANE, price: 4.50, vatRate: VatRate.FOUR, plu: '101', active: true, unit: Unit.KG, stock: 50 },
  { id: 'p2', name: 'Croissant Classico', category: Category.DOLCI, price: 1.20, vatRate: VatRate.TEN, plu: '201', active: true, unit: Unit.PIECE, stock: 100 },
  { id: 'p3', name: 'Focaccia Genovese', category: Category.SALATO, price: 15.00, vatRate: VatRate.FOUR, plu: '301', active: true, unit: Unit.KG, stock: 20 },
  
  // 10 Beverages
  { id: 'b1', name: 'Succo ACE', category: Category.BEVANDE, price: 2.80, vatRate: VatRate.TWENTY_TWO, plu: '502', active: true, unit: Unit.PIECE, stock: 24 },
  { id: 'b2', name: 'Succo Pera', category: Category.BEVANDE, price: 2.80, vatRate: VatRate.TWENTY_TWO, plu: '503', active: true, unit: Unit.PIECE, stock: 24 },
  { id: 'b3', name: 'Succo Pesca', category: Category.BEVANDE, price: 2.80, vatRate: VatRate.TWENTY_TWO, plu: '504', active: true, unit: Unit.PIECE, stock: 24 },
  { id: 'b4', name: 'Succo Arancia', category: Category.BEVANDE, price: 2.80, vatRate: VatRate.TWENTY_TWO, plu: '505', active: true, unit: Unit.PIECE, stock: 24 },
  { id: 'b5', name: 'Tè Limone', category: Category.BEVANDE, price: 3.00, vatRate: VatRate.TWENTY_TWO, plu: '506', active: true, unit: Unit.PIECE, stock: 30 },
  { id: 'b6', name: 'Tè Pesca', category: Category.BEVANDE, price: 3.00, vatRate: VatRate.TWENTY_TWO, plu: '507', active: true, unit: Unit.PIECE, stock: 30 },
  { id: 'b7', name: 'Acqua Naturale 0.5L', category: Category.BEVANDE, price: 1.00, vatRate: VatRate.TWENTY_TWO, plu: '508', active: true, unit: Unit.PIECE, stock: 100 },
  { id: 'b8', name: 'Acqua Frizzante 0.5L', category: Category.BEVANDE, price: 1.00, vatRate: VatRate.TWENTY_TWO, plu: '509', active: true, unit: Unit.PIECE, stock: 100 },
  { id: 'b9', name: 'Caffè Americano', category: Category.CAFFETTERIA, price: 1.80, vatRate: VatRate.TEN, plu: '402', active: true, unit: Unit.PIECE, stock: 999 },
  { id: 'b10', name: 'Cappuccino Freddo', category: Category.CAFFETTERIA, price: 2.50, vatRate: VatRate.TEN, plu: '403', active: true, unit: Unit.PIECE, stock: 999 },

  // 5 Savory
  { id: 's1', name: 'Panino Prosciutto', category: Category.SALATO, price: 5.50, vatRate: VatRate.TEN, plu: '302', active: true, unit: Unit.PIECE, stock: 15 },
  { id: 's2', name: 'Panino Salame', category: Category.SALATO, price: 5.00, vatRate: VatRate.TEN, plu: '303', active: true, unit: Unit.PIECE, stock: 15 },
  { id: 's3', name: 'Focaccia Farcita', category: Category.SALATO, price: 6.50, vatRate: VatRate.TEN, plu: '304', active: true, unit: Unit.PIECE, stock: 12 },
  { id: 's4', name: 'Pizza Margherita Taglio', category: Category.SALATO, price: 18.00, vatRate: VatRate.FOUR, plu: '305', active: true, unit: Unit.KG, stock: 10 },
  { id: 's5', name: 'Trancio Pizza Farcita', category: Category.SALATO, price: 4.50, vatRate: VatRate.TEN, plu: '306', active: true, unit: Unit.PIECE, stock: 20 },

  // 5 Sweets
  { id: 'd1', name: 'Muffin Cioccolato', category: Category.DOLCI, price: 2.20, vatRate: VatRate.TEN, plu: '202', active: true, unit: Unit.PIECE, stock: 24 },
  { id: 'd2', name: 'Muffin Mirtilli', category: Category.DOLCI, price: 2.20, vatRate: VatRate.TEN, plu: '203', active: true, unit: Unit.PIECE, stock: 24 },
  { id: 'd3', name: 'Donut Zucchero', category: Category.DOLCI, price: 1.80, vatRate: VatRate.TEN, plu: '204', active: true, unit: Unit.PIECE, stock: 30 },
  { id: 'd4', name: 'Donut Cioccolato', category: Category.DOLCI, price: 2.00, vatRate: VatRate.TEN, plu: '205', active: true, unit: Unit.PIECE, stock: 30 },
  { id: 'd5', name: 'Crostata Marmellata', category: Category.DOLCI, price: 12.00, vatRate: VatRate.TEN, plu: '206', active: true, unit: Unit.PIECE, stock: 8 },
];

export const OPERATORS: Operator[] = [
  { id: 'op1', name: 'Marco Bianchi', role: UserRole.ADMIN },
  { id: 'op2', name: 'Giulia Rossi', role: UserRole.CASHIER }
];
