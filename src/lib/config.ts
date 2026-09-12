const API_ROOT =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ??
  'https://api.eventstan.com';

const BASE = `${API_ROOT}/api/v1`;

export const API = {
  login: `${BASE}/auth/login`,
  logout: `${BASE}/auth/logout`,

  services: `${BASE}/services`,
  service: (id: string | number) => `${BASE}/services/${id}`,
  serviceToggle: (id: string | number) => `${BASE}/services/${id}/toggle`,
  serviceImages: (id: string | number) => `${BASE}/services/${id}/images`,
  deleteImage: (id: string | number, imgId: string | number) =>
    `${BASE}/services/${id}/images/${imgId}`,

  packages: `${BASE}/packages`,
  package: (id: string | number) => `${BASE}/packages/${id}`,

  bookings: `${BASE}/bookings`,
  bookingAction: (id: string | number) => `${BASE}/bookings/${id}/action`,

  profile: `${BASE}/vendors/me`,
  dashboard: `${BASE}/dashboard/vendor`,
} as const;

export function jsonHeaders(token?: string | null): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function multipartHeaders(token?: string | null): HeadersInit {
  return {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
