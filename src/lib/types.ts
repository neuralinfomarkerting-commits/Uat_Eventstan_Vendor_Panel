export type BookingStatus =
  | 'Pending'
  | 'Accepted'
  | 'Rejected (Vendor)'
  | 'Rejected (Admin – No Response)'
  | 'Cancelled (Admin/User)'
  | 'Payment Pending (Balance)'
  | 'Confirmed'
  | 'Completed';

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
  eventType: string;
  eventDate: string;
  eventVenue?: string;
  guests: number;
  amount: number;
  paidAmount: number;
  status: BookingStatus;
  createdAt: string;
  message?: string;
  // Raw backend status kept so actions (accept/reject/complete) can be
  // gated on the real lifecycle value instead of the simplified label.
  rawStatus?: string;
}

export type PriceUnit = 'per event' | 'per person' | 'per hour' | 'per day';

export interface Service {
  id: string;
  name: string;
  category: 'Venue' | 'Catering' | 'Decoration' | 'Entertainment' | 'Photography' | 'Other';
  description: string;
  priceMin: number;
  priceMax: number;
  priceUnit: PriceUnit;
  images: string[];
  isActive: boolean;
  rating: number;
  totalBookings: number;
}


export interface Package {
  id: string;
  name: string;
  description: string;
  price: number;
  discount?: number;
  services: string[]; // Core services
  addOns?: AddOnItem[]; // Optional add-ons
  isActive: boolean;
  createdAt: string;
}

export interface AddOnItem {
  serviceId: string;
  quantity: number;
  note?: string;
}

export interface VendorStats {
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  totalRevenue: number;
  pendingRevenue: number;
  averageRating: number;
  totalServices: number;
}
