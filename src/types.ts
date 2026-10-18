export type Role =
  | 'admin'
  | 'manager'
  | 'reception'
  | 'waiter'
  | 'kitchen'
  | 'bar'
  | 'cashier'
  | 'warehouse';
export interface User {
  id: string;
  name: string;
  role: Role;
  label: string;
  venueIds: string[];
}
export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
  initials: string;
}
export interface Table {
  id: string;
  venueId: string;
  code: string;
  seats: number;
  area: string;
  status: string;
  x: number;
  y: number;
}
export interface Booking {
  id: string;
  venueId: string;
  name: string;
  phone: string;
  day: string;
  time: string;
  covers: number;
  status: string;
  tableId: string | null;
  note: string;
  customerId: string | null;
}
export interface Session {
  id: string;
  venueId: string;
  tableId: string;
  covers: number;
  customerId?: string | null;
  status: string;
  openedAt: number;
  closedAt?: number;
  total: number;
  paid: number;
  due: number;
}
export interface Product {
  id: string;
  name: string;
  category: string;
  department: string;
  price: number;
  recipe?: Record<string, number> | null;
  description: string;
  available: boolean;
}
export interface Line {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price?: number;
  billQuantity?: number;
  discount?: { kind: 'none' | 'percent' | 'euro'; value: number };
  adjustments?: { at: number; user: string; reason: string }[];
  operationalChanges?: {
    at: number;
    from: number;
    to: number;
    reason: string;
  }[];
  department: string;
  course: string;
  serviceRound?: number;
  note: string;
  status: string;
  reason?: string;
  cancelledAt?: number;
  recipe?: Record<string, number> | null;
}
export interface Order {
  id: string;
  venueId: string;
  sessionId: string;
  createdAt: number;
  lines: Line[];
}
export interface Payment {
  id: string;
  venueId: string;
  sessionId: string;
  amount: number;
  method: string;
  tip?: number;
  tipTax?: number;
  tipTaxBasisPoints?: number | null;
  cashReceived?: number;
  changeAmount?: number;
  changeCounts?: Record<string, number>;
  at: number;
}
export interface Ingredient {
  costMissing?: boolean;
  catalogCategory?: string;
  id: string;
  name: string;
  unit: string;
  min: number;
  cost: number;
  quantity: number;
  expected: number;
}
export interface Movement {
  documentId?: string;
  id: string;
  venueId: string;
  ingredientId: string;
  quantity: number;
  type: string;
  source: string;
  at: number;
}
export interface Customer {
  id: string;
  name: string;
  phone: string;
  visits: number;
  marketingConsent: boolean;
  credit: number;
  bonus: number;
  points: number;
}
export interface Print {
  id: string;
  venueId: string;
  orderId: string;
  department: string;
  status: string;
  attempt: number;
  at: number;
  reprint?: boolean;
  correction?: boolean;
  cancellation?: boolean;
}
export interface Alert {
  id: string;
  venueId: string;
  name: string;
  type: string;
  value: number | null;
  min: number;
  max: number;
  lastReading: number;
  status: string;
  note: string;
  operatorNote?: string;
}
export interface Notification {
  id: string;
  venueId: string;
  title: string;
  body: string;
  status: string;
  at: number;
}
export interface Audit {
  id: string;
  user: string;
  action: string;
  target: string;
  reason: string;
  at: number;
}
export interface Transfer {
  id: string;
  from: string;
  to: string;
  ingredientId: string;
  quantity: number;
  status: string;
  at: number;
}
export interface Drawer {
  venueId: string;
  day: string;
  counts: Record<string, number>;
  total: number;
  untracked: number;
  movements: {
    id: string;
    type: string;
    counts: Record<string, number>;
    source: string;
    user: string;
    at: number;
  }[];
}
export interface DocumentRow {
  id: string;
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number | null;
  catalogCategory: 'kitchen' | 'beverage' | 'supplies';
  source?: string;
}
export interface DeliveryDocument {
  id: string;
  venueId: string;
  originalName: string;
  mediaType: string;
  size: number;
  status: string;
  uploadedAt: number;
  user: string;
  supplier: string;
  documentNumber: string;
  documentDay: string;
  warnings: string[];
  extractionMode: string;
  rowCount: number;
  receiptId?: string;
  text?: string;
  suggestedRows?: DocumentRow[];
  reviewedRows?: DocumentRow[];
}
export interface State {
  revision: number;
  day: string;
  user: User;
  venues: Venue[];
  venueId: string;
  tables: Table[];
  sessions: Session[];
  products: Product[];
  orders: Order[];
  bookings: Booking[];
  prints: Print[];
  alerts: Alert[];
  notifications: Notification[];
  payments?: Payment[];
  drawers?: Drawer[];
  tipTaxBasisPoints?: number | null;
  customers?: Customer[];
  ingredients?: Ingredient[];
  movements?: Movement[];
  transfers?: Transfer[];
  audit?: Audit[];
  documents?: DeliveryDocument[];
}
export type Act = (
  action: string,
  payload: Record<string, unknown>,
) => Promise<{ id?: string; message: string }>;
