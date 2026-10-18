export type Counts = Record<string, number>;
export interface BillLine {
  quantity: number;
  price?: number;
  billQuantity?: number;
  discount?: { kind: 'none' | 'percent' | 'euro'; value: number };
}
export const DENOMINATIONS: number[];
export const MAX_CHANGE: number;
export function parseEuro(value: unknown): number;
export function lineAmounts(line: BillLine): {
  gross: number;
  discount: number;
  total: number;
};
export function taxOnTip(tip: number, basisPoints: number): number;
export function validCounts(counts: unknown): boolean;
export function countTotal(counts: Counts): number;
export function addCounts(a: Counts, b: Counts): Counts;
export function suggestChange(amount: number, counts: Counts): Counts | null;
