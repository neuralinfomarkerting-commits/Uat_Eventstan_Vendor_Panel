type JsonBody = object | unknown[];
const API_BASE_URL = '/api/proxy/api/v1';

function getVendorToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vendor_token');
}

function headers(token = getVendorToken(), accept = 'application/json'): HeadersInit {
  return {
    Accept: accept,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const REQUEST_TIMEOUT_MS = 15000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
  } catch (cause) {
    if (cause instanceof Error && cause.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw cause;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const rawText = await response.text().catch(() => '');
    let errorBody: { message?: string; error?: string } | null = null;
    try {
      errorBody = rawText ? JSON.parse(rawText) : null;
    } catch {
      errorBody = null;
    }
    const message =
      errorBody?.message ||
      errorBody?.error ||
      `Request failed: ${response.status}${response.statusText ? ` ${response.statusText}` : ''}`;
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function jsonOptions(method: string, body?: JsonBody): RequestInit {
  return {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  };
}

function generateImageUrl(filename: string, folder: string): string {
  const today = new Date().toISOString().split('T')[0];
  return `https://api.eventstan.com/api/v1/uploads/images/${folder}/${today}/${filename}`;
}

const masterDataCache = new Map<string, Promise<unknown>>();

function cachedRequest<T>(cacheKey: string, path: string): Promise<T> {
  const existing = masterDataCache.get(cacheKey);
  if (existing) return existing as Promise<T>;

  const promise = request<T>(path).catch((error) => {
    masterDataCache.delete(cacheKey);
    throw error;
  });

  masterDataCache.set(cacheKey, promise);
  return promise;
}

function clearMasterDataCache(prefix?: string) {
  if (!prefix) {
    masterDataCache.clear();
    return;
  }
  for (const key of masterDataCache.keys()) {
    if (key.startsWith(prefix)) masterDataCache.delete(key);
  }
}

export const vendorApi = {
  uploads: {
    image: async (file: File, folder = 'vendors') => {
      const body = new FormData();
      body.append('file', file);

      const response = await fetch(`${API_BASE_URL}/uploads/images?folder=${encodeURIComponent(folder)}`, {
        method: 'POST',
        headers: getVendorToken() ? { Authorization: `Bearer ${getVendorToken()}` } : undefined,
        body,
      });

      if (!response.ok) throw new Error(`Image upload failed: ${response.status}`);

      const result = await response.json() as { bucket: string; key: string; url: string; contentType: string; size: number };

      let filename = '';
      if (result.url) {
        const urlParts = result.url.split('/');
        filename = urlParts[urlParts.length - 1];
      } else if (result.key) {
        const keyParts = result.key.split('/');
        filename = keyParts[keyParts.length - 1];
      } else {
        const extension = file.name.split('.').pop();
        const uniqueId = crypto.randomUUID?.() || Date.now().toString();
        filename = `${uniqueId}.${extension}`;
      }

      const imageUrl = generateImageUrl(filename, folder);

      return {
        ...result,
        url: imageUrl,
        filename: filename,
      };
    },
  },

  auth: {
    login: <T = unknown>(email: string, password: string) =>
      request<T>('auth/login', jsonOptions('POST', { email, password })),
    logout: () => request<void>('auth/logout', jsonOptions('POST')),
    me: <T = unknown>() => request<T>('auth/me', { headers: headers() }),
    changePassword: <T = unknown>(payload: { currentPassword: string; newPassword: string }) =>
      request<T>('auth/change-password', jsonOptions('POST', payload)),
  },

  dashboard: {
    get: <T = unknown>() => request<T>('dashboard/vendor', { cache: 'no-store', headers: headers() }),
  },

  bookings: {
    list: <T = unknown[]>() => request<T>('bookings', { cache: 'no-store', headers: headers() }),
    accept: <T = unknown>(id: string) => request<T>(`bookings/${id}/vendor-accept`, jsonOptions('PATCH')),
    reject: <T = unknown>(id: string) => request<T>(`bookings/${id}/vendor-reject`, jsonOptions('PATCH')),
    complete: <T = unknown>(id: string) => request<T>(`bookings/${id}/complete`, jsonOptions('PATCH')),
  },

  profile: {
    get: <T = unknown>() => request<T>('vendors/me', { cache: 'no-store', headers: headers() }),
    update: <T = unknown>(payload: JsonBody) => request<T>('vendors/me', jsonOptions('PUT', payload)),
  },

  availability: {
    list: <T = unknown[]>() => request<T>('availability/me', { cache: 'no-store', headers: headers() }),
    upsert: <T = unknown>(payload: JsonBody) => request<T>('availability', jsonOptions('PUT', payload)),
  },

  services: {
    list: <T = unknown[]>() =>
      request<T>('services?includeAll=true', {
        cache: 'no-store',
        headers: headers(getVendorToken()),
      }),
    get: <T = unknown>(id: string) => request<T>(`services/${id}`, { headers: headers() }),
    checkSlug: <T = unknown>(slug: string, excludeId?: string) =>
      request<T>(
        `services/slug-availability?slug=${encodeURIComponent(slug)}${excludeId ? `&excludeId=${encodeURIComponent(excludeId)}` : ''}`,
      ),
    create: <T = unknown>(payload: JsonBody) => request<T>('services', jsonOptions('POST', payload)),
    update: <T = unknown>(id: string, payload: JsonBody) => request<T>(`services/${id}`, jsonOptions('PUT', payload)),
    updateStatus: (id: string, status: string) =>
      request<unknown>(`services/${id}`, jsonOptions('PATCH', { status })),
    delete: (id: string) => request<void>(`services/${id}`, jsonOptions('DELETE')),
    createSubService: (serviceId: string, payload: JsonBody) =>
      request<unknown>(`services/${serviceId}/sub-services`, jsonOptions('POST', payload)),
    updateSubService: (subServiceId: string, payload: JsonBody) =>
      request<unknown>(`sub-services/${subServiceId}`, jsonOptions('PUT', payload)),
    deleteSubService: (subServiceId: string) =>
      request<void>(`sub-services/${subServiceId}`, jsonOptions('DELETE')),
  },

  packages: {
    list: <T = unknown[]>() => request<T>('packages', { headers: headers(getVendorToken(), '*/*') }),
    get: <T = unknown>(id: string) => request<T>(`packages/${id}`, { headers: headers() }),
    create: <T = unknown>(payload: JsonBody) => request<T>('packages', jsonOptions('POST', payload)),
    update: <T = unknown>(id: string, payload: JsonBody) => request<T>(`packages/${id}`, jsonOptions('PUT', payload)),
    updateStatus: (id: string, status: string) =>
      request<unknown>(`packages/${id}`, jsonOptions('PATCH', { status })),
    delete: (id: string) => request<void>(`packages/${id}`, jsonOptions('DELETE')),
  },

  support: {
    list: <T = unknown[]>() => request<T>('support/tickets', { cache: 'no-store', headers: headers() }),
    get: <T = unknown>(id: string) => request<T>(`support/tickets/${id}`, { cache: 'no-store', headers: headers() }),
    create: <T = unknown>(payload: JsonBody) => request<T>('support/tickets', jsonOptions('POST', payload)),
    reply: <T = unknown>(id: string, payload: JsonBody) =>
      request<T>(`support/tickets/${id}/replies`, jsonOptions('POST', payload)),
  },

  masterData: {
    countries: <T = unknown[]>() => cachedRequest<T>('countries', 'master-data/countries'),
    categories: <T = unknown[]>() => cachedRequest<T>('categories', 'master-data/categories'),
    priceUnits: <T = unknown[]>() => cachedRequest<T>('price-units', 'master-data/price-units'),
    visaTypes: <T = unknown[]>() => cachedRequest<T>('visa-types', 'master-data/visa-types'),
    eventSlots: <T = unknown[]>() => cachedRequest<T>('event-slots', 'master-data/event-slots'),
    states: <T = unknown[]>(countryId?: number) =>
      cachedRequest<T>(
        `states:${countryId ?? 'all'}`,
        `master-data/states${countryId ? `?countryId=${countryId}` : ''}`,
      ),
    cities: <T = unknown[]>(countryId?: number, stateId?: string) => {
      const params = new URLSearchParams();
      if (countryId) params.set('countryId', String(countryId));
      if (stateId) params.set('stateId', stateId);
      const query = params.toString();
      return cachedRequest<T>(
        `cities:${countryId ?? 'all'}:${stateId ?? 'all'}`,
        `master-data/cities${query ? `?${query}` : ''}`,
      );
    },
    clearCache: clearMasterDataCache,
  },
};