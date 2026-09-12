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
  items: Array<{ title: string; eventDate: string; quantity: number }>;
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

export function normalizeBooking(item: ApiBooking): Booking {
  const firstItem = item.items[0];
  const paidAmount = item.payments
    .filter((payment) => payment.status === 'SUCCEEDED')
    .reduce((total, payment) => total + payment.amount, 0);

  return {
    id: item.id,
    customerName: item.customer.name,
    customerEmail: item.customer.email,
    customerPhone: item.customer.phone ?? undefined,
    serviceName: item.items.map((bookingItem) => bookingItem.title).join(', ') || 'Event service',
    eventType: firstItem?.title ?? 'Event',
    eventDate: firstItem ? new Date(firstItem.eventDate).toLocaleDateString('en-GB') : '-',
    eventVenue: item.eventAddress,
    guests: firstItem?.quantity ?? 1,
    amount: item.totalAmount,
    paidAmount,
    status: labels[item.status] ?? 'Pending',
    createdAt: new Date(item.createdAt).toLocaleDateString('en-GB'),
    message: item.notes ?? undefined,
    rawStatus: item.status,
  };
}

export function canVendorReview(status: BookingStatus) {
  return status === 'Pending';
}

// A booking can be marked complete once the vendor has accepted it and it's
// actively confirmed/in-progress on the backend (CONFIRMED or IN_PROGRESS).
export function canMarkComplete(booking: Booking) {
  return booking.rawStatus === 'CONFIRMED' || booking.rawStatus === 'IN_PROGRESS';
}
