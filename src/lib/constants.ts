export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ??
  'https://api.eventstan.com';
