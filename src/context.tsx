import { createContext, useContext } from 'react';
import type { State, Act } from './types';
export type Page =
  | 'dashboard'
  | 'bookings'
  | 'tables'
  | 'orders'
  | 'kitchen'
  | 'bar'
  | 'cashier'
  | 'menu'
  | 'inventory'
  | 'customers'
  | 'temperatures'
  | 'notifications'
  | 'settings';
export interface AppContextType {
  state: State;
  act: Act;
  busy: boolean;
  navigate: (p: Page) => void;
  refresh: () => Promise<void>;
}
export const AppContext = createContext<AppContextType | null>(null);
export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error('Contesto applicazione assente');
  return c;
}
export const navPermissions: Record<string, Page[]> = {
  admin: [
    'dashboard',
    'bookings',
    'tables',
    'orders',
    'kitchen',
    'bar',
    'cashier',
    'menu',
    'inventory',
    'customers',
    'temperatures',
    'notifications',
    'settings',
  ],
  manager: [
    'dashboard',
    'bookings',
    'tables',
    'orders',
    'kitchen',
    'bar',
    'cashier',
    'menu',
    'inventory',
    'customers',
    'temperatures',
    'notifications',
    'settings',
  ],
  reception: ['bookings', 'tables', 'notifications'],
  waiter: ['orders', 'tables'],
  kitchen: ['kitchen', 'temperatures'],
  bar: ['bar'],
  cashier: ['cashier', 'customers'],
  warehouse: ['inventory', 'menu'],
};
