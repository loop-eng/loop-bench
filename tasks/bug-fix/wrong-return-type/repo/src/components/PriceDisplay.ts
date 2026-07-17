import { formatCurrency } from "../utils/format.js";

export interface PriceProps {
  amount: number;
  currency?: string;
}

export function renderPrice(props: PriceProps): string {
  const formatted = formatCurrency(props.amount);
  const label = (props.currency ?? "USD").toUpperCase();
  return `${formatted} ${label}`;
}

export function renderPriceRange(min: number, max: number): string {
  return `${formatCurrency(min)} – ${formatCurrency(max)}`;
}
