import type { Booking, BookingStatus } from './types';

export interface ApiBooking {
  id: string;
  status: string;
  eventAddress: string;
  notes?: string | null;
  totalAmount: number;
  advanceDueAmount: number;
  remainingDueAmount: number;
  currency: string;
  createdAt: string;
  customer: { name: string; email: string; phone?: string | null };
  items: Array<{ title: string; eventDate: string; quantity: number; unitAmount?: number; vendorId?: string }>;
  payments: Array<{ amount: number; status: string }>;
}

const labels: Record<string, BookingStatus> = {
  DRAFT: 'Pending',
  PENDING_PAYMENT: 'Payment Pending (Balance)',
  PAYMENT_RECEIVED: 'Pending',
  VENDOR_REVIEW: 'Pending',
  VENDOR_ACCEPTED: 'Accepted',
  CUSTOMER_CONFIRMATION: 'Accepted',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled (Admin/User)',
  REFUNDED: 'Rejected (Vendor)',
};

export function normalizeBooking(item: ApiBooking, vendorId?: string | null): Booking {
  const items = vendorId
    ? (item.items ?? []).filter((bookingItem: any) => !bookingItem.vendorId || bookingItem.vendorId === vendorId)
    : (item.items ?? []);
  const payments = item.payments ?? [];
  const firstItem = items[0];
  const paidAmount = payments
    .filter((payment) => payment.status === 'SUCCEEDED')
    .reduce((total, payment) => total + payment.amount, 0);
  const ownAmount = items.reduce(
    (total, bookingItem) => total + (bookingItem.unitAmount ?? 0) * (bookingItem.quantity ?? 1),
    0,
  );
  
  
  const isPartialBooking = vendorId && items.length < (item.items ?? []).length;

  return {
    id: item.id,
    customerName: item.customer?.name ?? 'Customer',
    customerEmail: item.customer?.email ?? '-',
    customerPhone: item.customer?.phone ?? undefined,
    serviceName: items.map((bookingItem) => bookingItem.title).join(', ') || 'Event service',
    eventType: firstItem?.title ?? 'Event',
    eventDate: firstItem?.eventDate ? new Date(firstItem.eventDate).toLocaleDateString('en-GB') : '-',
    eventVenue: item.eventAddress,
    guests: firstItem?.quantity ?? 1,
    amount: isPartialBooking ? ownAmount : item.totalAmount,
    paidAmount,
    currency: item.currency || 'AED',
    status: labels[item.status] ?? 'Pending',
    createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-',
    message: item.notes ?? undefined,
    rawStatus: item.status,
  };
}

export function canVendorReview(status: BookingStatus) {
  return status === 'Pending';
}

export function canMarkComplete(booking: Booking) {
  return booking.rawStatus === 'CONFIRMED' || booking.rawStatus === 'IN_PROGRESS';
}

export function isFullApiBooking(value: unknown): value is ApiBooking {
  const item = value as Partial<ApiBooking> | null | undefined;
  return Boolean(item && Array.isArray(item.items) && item.customer && Array.isArray(item.payments));
}

export function formatMoney(amount: number, currency?: string | null) {
  return `${currency || 'AED'} ${amount.toLocaleString()}`;
}