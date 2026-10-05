import type { Booking, BookingAddress, BookingStatus } from './types';

export interface ApiBooking {
  id: string;
  status: string;
  eventAddress: string | BookingAddress;
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
  VENDOR_ACCEPTED: 'Confirmed',
  CUSTOMER_CONFIRMATION: 'Confirmed',
  CONFIRMED: 'Confirmed',
  IN_PROGRESS: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Cancelled',
};

// Backend field names for city/state/country/phone-code aren't guaranteed, so
// read the likely candidates defensively. Notes ("Phone: +971.. - Country: ..")
// are parsed separately in bookings/helpers.ts as a fallback.
function pick(source: unknown, keys: string[]): string | undefined {
  const obj = source as Record<string, unknown> | null | undefined;
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

// The address object ({ addressLine1, landmark, poBoxNumber, stateId, cityId, ... })
// may arrive under a few different keys depending on the endpoint.
function findAddress(item: ApiBooking): BookingAddress | undefined {
  const source = item as unknown as Record<string, any>;
  const customer = source.customer as Record<string, any> | undefined;
  const addresses = Array.isArray(customer?.addresses) ? customer!.addresses : [];
  const candidates = [
    source.address,
    source.eventAddress,
    source.eventAddressDetails,
    source.customerAddress,
    source.shippingAddress,
    customer?.address,
    addresses.find((a: any) => a?.isDefault) ?? addresses[0],
  ];
  const found = candidates.find(
    (c) => c && typeof c === 'object' && ('addressLine1' in c || 'stateId' in c || 'cityId' in c),
  );
  if (!found) return undefined;
  return {
    addressLine1: found.addressLine1,
    addressLine2: found.addressLine2,
    landmark: found.landmark,
    poBoxNumber: found.poBoxNumber,
    stateId: found.stateId,
    cityId: found.cityId,
  };
}

function noteValue(notes: string | null | undefined, label: string): string | undefined {
  if (!notes) return undefined;
  const re = new RegExp(`(?:^|\\s-\\s)${label}:\\s*(.*?)(?=\\s-\\s|$)`, 'i');
  return re.exec(notes)?.[1]?.trim() || undefined;
}

function buildPhone(item: ApiBooking): string | undefined {
  const fromNotes = noteValue(item.notes, 'Phone');
  const raw = item.customer?.phone?.trim();
  const code = pick(item.customer, ['phoneCode', 'countryCode', 'dialCode', 'phoneCountryCode', 'callingCode']);
  if (raw && raw.startsWith('+')) return raw;
  if (raw && code) return `${code.startsWith('+') ? code : `+${code}`} ${raw}`;
  if (fromNotes && fromNotes.startsWith('+')) return fromNotes;
  return raw || fromNotes;
}

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
    customerPhone: buildPhone(item),
    serviceName: items.map((bookingItem) => bookingItem.title).join(', ') || 'Event service',
    eventType: firstItem?.title ?? 'Event',
    eventDate: firstItem?.eventDate ? new Date(firstItem.eventDate).toLocaleDateString('en-GB') : '-',
    eventVenue: typeof item.eventAddress === 'string' ? item.eventAddress : undefined,
    address: findAddress(item),
    guests: firstItem?.quantity ?? 1,
    amount: isPartialBooking ? ownAmount : item.totalAmount,
    paidAmount,
    currency: item.currency || 'AED',
    status: labels[item.status] ?? 'Pending',
    createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-',
    message: item.notes ?? undefined,
    rawStatus: item.status,
    items: items.map((bookingItem) => ({ title: bookingItem.title, quantity: bookingItem.quantity })),
    eventCity: pick(item, ['eventCity', 'city']) ?? noteValue(item.notes, 'City'),
    eventState: pick(item, ['eventState', 'state']) ?? noteValue(item.notes, 'State'),
    eventCountry: pick(item, ['eventCountry', 'country']) ?? noteValue(item.notes, 'Country'),
    eventZip: pick(item, ['eventZip', 'zip', 'zipCode', 'postalCode']) ?? noteValue(item.notes, 'Zip'),
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