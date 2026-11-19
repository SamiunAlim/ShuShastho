import type { TranslationKey } from '../constants/i18n';
import type { PaymentInfo, PaymentMethod } from '../services/api';

export const METHOD_NAME_KEY: Record<PaymentMethod, TranslationKey> = {
  cash_at_chamber: 'cashAtChamber',
  bkash: 'payBkash',
  nagad: 'payNagad',
  card: 'payCard',
};

export const METHOD_ICON: Record<PaymentMethod, 'cash-outline' | 'wallet-outline' | 'phone-portrait-outline' | 'card-outline'> = {
  cash_at_chamber: 'cash-outline',
  bkash: 'wallet-outline',
  nagad: 'phone-portrait-outline',
  card: 'card-outline',
};

const TXN_PREFIX: Record<PaymentMethod, string> = { cash_at_chamber: 'CASH', bkash: 'BK', nagad: 'NG', card: 'CD' };

/** e.g. DEMO-BK-48213. Clearly fake so it can never be mistaken for a real transaction. */
export function demoTransactionId(method: PaymentMethod) {
  return `DEMO-${TXN_PREFIX[method]}-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function isPaid(payment?: Pick<PaymentInfo, 'status'> | null) {
  return payment?.status === 'paid';
}

/** hh:mm AM/PM for an ISO time (digits are localised by the caller with nf()). */
export function clockTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
