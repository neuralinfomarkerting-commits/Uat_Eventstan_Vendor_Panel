import { Booking } from '@/lib/types';

export const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'Accepted':          { bg: 'bg-cyan-50',    text: 'text-cyan-700',    dot: 'bg-cyan-400' },
  'Confirmed':         { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  'Completed':         { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-400' },
  'Rejected (Vendor)': { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
};

export const rowAccent: Record<string, string> = {
  'Pending':           'border-l-amber-400',
  'Accepted':          'border-l-cyan-400',
  'Confirmed':         'border-l-green-400',
  'Completed':         'border-l-indigo-400',
  'Rejected (Vendor)': 'border-l-red-400',
};

export const avatarPalette = [
  'from-orange-400 to-amber-500',
  'from-blue-400 to-cyan-500',
  'from-purple-400 to-pink-500',
  'from-green-400 to-emerald-500',
  'from-rose-400 to-red-500',
  'from-indigo-400 to-violet-500',
];

export function getAvatarColor(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return avatarPalette[hash % avatarPalette.length];
}

export type TabValue = 'Pending' | 'Accepted' | 'Confirmed' | 'Completed' | 'Rejected (Vendor)'
  | 'All' | 'In Process' | 'Rejected';

export const tabStyles: Record<TabValue, { active: string; badge: string }> = {
  'All':          { active: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30', badge: 'bg-white/25 text-white' },
  'In Process':   { active: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30', badge: 'bg-white/25 text-white' },
  'Accepted':     { active: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30', badge: 'bg-white/25 text-white' },
  'Rejected':     { active: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30', badge: 'bg-white/25 text-white' },
  'Completed':    { active: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30', badge: 'bg-white/25 text-white' },
  'Pending':      { active: '', badge: '' },
  'Confirmed':    { active: '', badge: '' },
  'Rejected (Vendor)': { active: '', badge: '' },
};

export const tabs: { label: string; value: TabValue }[] = [
  { label: 'All Bookings', value: 'All' },
  { label: 'In Process',   value: 'In Process' },
  { label: 'Accepted',     value: 'Accepted' },
  { label: 'Rejected',     value: 'Rejected' },
  { label: 'Completed',    value: 'Completed' },
];

export function matchesTab(status: string, tab: TabValue) {
  if (tab === 'All') return true;
  if (tab === 'In Process') return status === 'Pending';
  if (tab === 'Rejected') return status.startsWith('Rejected');
  return status === tab;
}

export type SortKey = 'id' | 'customerName' | 'eventDate' | 'status' | 'createdAt';
export type SortDir = 'asc' | 'desc';

export const PAGE_SIZES = [5, 10, 25];

type BookingItem = { title?: string };

export function getPackageItems(booking: Booking): BookingItem[] {
  const items = (booking as unknown as { items?: BookingItem[] }).items;
  return Array.isArray(items) ? items : [];
}

export function getPackageName(booking: Booking): string {
  const items = getPackageItems(booking);
  if (items.length > 0) {
    const titles = items.map(i => i.title).filter(Boolean) as string[];
    if (titles.length > 0) return titles.join(', ');
  }
  return booking.serviceName || 'N/A';
}

export function getEventType(booking: Booking): string {
  const type = (booking as unknown as { eventType?: string }).eventType;
  return type && type.trim() ? type : 'N/A';
}

export function getProfileImage(booking: Booking): string | undefined {
  const b = booking as unknown as {
    customerImage?: string;
    avatar?: string;
    profileImage?: string;
    customer?: { profileImage?: string; avatar?: string; customerImage?: string };
  };
  return (
    b.customer?.profileImage
    ?? b.customer?.avatar
    ?? b.customer?.customerImage
    ?? b.profileImage
    ?? b.customerImage
    ?? b.avatar
  );
}

// The customer app builds this string (see checkout/page.tsx and payment/page.tsx) as:
//   "Address Line 1: X - Address Line 2: Y - City: Z - State: W - PO Box: V - Landmark: U - <message>"
// joined with " - ", skipping any empty parts. Order and keys must match exactly.
type AddressParts = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  poBox: string;
  landmark: string;
};

function parseAddress(booking: Booking): AddressParts | null {
  const notes = booking.message ?? (booking as unknown as { notes?: string }).notes ?? '';
  if (!notes.trim()) return null;
  if (!/address line 1:/i.test(notes)) return null;

  const parts = notes.split(' - ').map(p => p.trim()).filter(Boolean);
  const result: AddressParts = { line1: '', line2: '', city: '', state: '', poBox: '', landmark: '' };

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower.startsWith('address line 1:')) {
      result.line1 = part.replace(/^address line 1:\s*/i, '').trim();
    } else if (lower.startsWith('address line 2:')) {
      result.line2 = part.replace(/^address line 2:\s*/i, '').trim();
    } else if (lower.startsWith('city:')) {
      result.city = part.replace(/^city:\s*/i, '').trim();
    } else if (lower.startsWith('state:')) {
      result.state = part.replace(/^state:\s*/i, '').trim();
    } else if (lower.startsWith('po box:')) {
      result.poBox = part.replace(/^po box:\s*/i, '').trim();
    } else if (lower.startsWith('landmark:')) {
      result.landmark = part.replace(/^landmark:\s*/i, '').trim();
    }
  }

  if (!result.line1 && !result.line2 && !result.city && !result.state && !result.poBox && !result.landmark) {
    return null;
  }
  return result;
}

export type AddressLine = { label: string; value: string };

export function getAddressLines(booking: Booking): AddressLine[] {
  const parsed = parseAddress(booking);
  if (parsed) {
    const lines: AddressLine[] = [];
    if (parsed.line1) lines.push({ label: 'Address Line 1', value: parsed.line1 });
    if (parsed.line2) lines.push({ label: 'Address Line 2', value: parsed.line2 });
    if (parsed.city) lines.push({ label: 'City', value: parsed.city });
    if (parsed.state) lines.push({ label: 'State', value: parsed.state });
    if (parsed.poBox) lines.push({ label: 'PO Box', value: parsed.poBox });
    if (parsed.landmark) lines.push({ label: 'Landmark', value: parsed.landmark });
    if (lines.length > 0) return lines;
  }
  if (booking.eventVenue) return [{ label: 'Venue', value: booking.eventVenue }];
  return [{ label: '', value: 'N/A' }];
}

export function getCustomerMessage(booking: Booking): string {
  const notes = booking.message ?? (booking as unknown as { notes?: string }).notes ?? '';
  if (!notes.trim()) return 'N/A';

  if (/address line 1:/i.test(notes)) {
    const parts = notes.split(' - ').map(p => p.trim()).filter(Boolean);
    const addressKeywords = [
      /^address line/i,
      /^city:/i,
      /^state:/i,
      /^po box:/i,
      /^landmark:/i,
      /^country:/i,
      /^zip:/i,
    ];
    const messageParts = parts.filter(p => !addressKeywords.some(re => re.test(p)));
    if (messageParts.length > 0) return messageParts.join(' - ');
    return 'N/A';
  }

  return notes;
}
