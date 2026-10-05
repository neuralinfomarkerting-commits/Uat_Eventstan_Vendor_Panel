import { Booking } from '@/lib/types';

export const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'Confirmed':         { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  'Completed':         { bg: 'bg-purple-50',  text: 'text-purple-700',  dot: 'bg-purple-400' },
  'Cancelled':         { bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-400' },
};

export const rowAccent: Record<string, string> = {
  'Pending':           'border-l-amber-400',
  'Confirmed':         'border-l-green-400',
  'Completed':         'border-l-indigo-400',
  'Cancelled':         'border-l-red-400',
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

export type TabValue = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled'
  | 'All' | 'In Process';

export const tabStyles: Record<TabValue, { active: string; badge: string }> = {
  'All':          { active: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30', badge: 'bg-white/25 text-white' },
  'In Process':   { active: 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg shadow-amber-500/30', badge: 'bg-white/25 text-white' },
  'Confirmed':    { active: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30', badge: 'bg-white/25 text-white' },
  'Cancelled':    { active: 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30', badge: 'bg-white/25 text-white' },
  'Completed':    { active: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30', badge: 'bg-white/25 text-white' },
  'Pending':      { active: '', badge: '' },
};

export const tabs: { label: string; value: TabValue }[] = [
  { label: 'All Bookings', value: 'All' },
  { label: 'In Process',   value: 'In Process' },
  { label: 'Confirmed',    value: 'Confirmed' },
  { label: 'Cancelled',    value: 'Cancelled' },
  { label: 'Completed',    value: 'Completed' },
];

export function matchesTab(status: string, tab: TabValue) {
  if (tab === 'All') return true;
  if (tab === 'In Process') return status === 'Pending';
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

// One entry per package. With several packages they are labelled P1, P2, ...
export function getPackageLines(booking: Booking): string[] {
  const titles = getPackageItems(booking).map(i => i.title).filter(Boolean) as string[];
  if (titles.length > 1) return titles.map((t, i) => `P${i + 1}: ${t}`);
  if (titles.length === 1) return titles;
  return [booking.serviceName || 'N/A'];
}

export function getPackageName(booking: Booking): string {
  return getPackageLines(booking).join('\n');
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
  country: string;
  zip: string;
};

function parseAddress(booking: Booking): AddressParts | null {
  const notes = booking.message ?? (booking as unknown as { notes?: string }).notes ?? '';
  if (!notes.trim()) return null;
  if (!/(address line 1|city|state|country|zip|po box|landmark):/i.test(notes)) return null;

  const parts = notes.split(' - ').map(p => p.trim()).filter(Boolean);
  const result: AddressParts = { line1: '', line2: '', city: '', state: '', poBox: '', landmark: '', country: '', zip: '' };

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
    } else if (lower.startsWith('country:')) {
      result.country = part.replace(/^country:\s*/i, '').trim();
    } else if (lower.startsWith('zip:')) {
      result.zip = part.replace(/^zip:\s*/i, '').trim();
    }
  }

  if (!result.line1 && !result.line2 && !result.city && !result.state && !result.poBox && !result.landmark && !result.country && !result.zip) {
    return null;
  }
  return result;
}

export type AddressLine = { label: string; value: string };

export type ResolvedLocation = { city?: string; state?: string; country?: string };

export function getAddressLines(booking: Booking, resolved?: ResolvedLocation): AddressLine[] {
  const parsed = parseAddress(booking);
  const lines: AddressLine[] = [];
  const add = (label: string, value?: string) => {
    if (value && value.trim() && !lines.some(l => l.label === label)) lines.push({ label, value: value.trim() });
  };
  const addr = booking.address;
  const hasLines = Boolean(parsed?.line1 || parsed?.line2 || addr?.addressLine1 || addr?.addressLine2);
  add('Address Line 1', addr?.addressLine1 || parsed?.line1);
  add('Address Line 2', addr?.addressLine2 || parsed?.line2);
  // No structured lines in the notes: fall back to the full venue string.
  if (!hasLines) add('Address', booking.eventVenue);
  add('City', resolved?.city || parsed?.city || booking.eventCity);
  add('State', resolved?.state || parsed?.state || booking.eventState);
  add('Country', resolved?.country || parsed?.country || booking.eventCountry);
  add('Zip', parsed?.zip || booking.eventZip);
  add('PO Box', addr?.poBoxNumber || parsed?.poBox);
  add('Landmark', addr?.landmark || parsed?.landmark);
  return lines.length > 0 ? lines : [{ label: '', value: 'N/A' }];
}

export function getCustomerMessage(booking: Booking): string {
  const notes = booking.message ?? (booking as unknown as { notes?: string }).notes ?? '';
  if (!notes.trim()) return 'N/A';

  if (/(address line 1|city|state|country|zip|po box|landmark|phone):/i.test(notes)) {
    const parts = notes.split(' - ').map(p => p.trim()).filter(Boolean);
    const addressKeywords = [
      /^address line/i,
      /^phone:/i,
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
