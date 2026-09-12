/**
 * store.ts — In-memory store for Services + Packages (mock mode).
 * Uses mockData as seed data. Survives page navigation within session.
 */
import { Package, Service } from './types';
import { mockPackages, mockServices } from './mockData';

// ─── Slug helpers ─────────────────────────────────────────────
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// ─── Services store ───────────────────────────────────────────
let _services: Service[] = mockServices.map(s => ({
  ...s,
  slug: generateSlug(s.name),
}));

export type ServiceWithSlug = Service & { slug: string };

export const serviceStore = {
  getAll:  (): ServiceWithSlug[]           => _services as ServiceWithSlug[],
  getById: (id: string): ServiceWithSlug | null =>
    (_services.find(s => s.id === id) ?? null) as ServiceWithSlug | null,
  getBySlug: (slug: string): ServiceWithSlug | null =>
    (_services.find(s => (s as ServiceWithSlug).slug === slug) ?? null) as ServiceWithSlug | null,

  save: (svc: ServiceWithSlug) => {
    const idx = _services.findIndex(s => s.id === svc.id);
    if (idx >= 0) _services = _services.map(s => s.id === svc.id ? svc : s);
    else _services = [..._services, svc];
  },

  delete: (id: string) => { _services = _services.filter(s => s.id !== id); },

  toggleActive: (id: string) => {
    _services = _services.map(s => s.id === id ? { ...s, isActive: !s.isActive } : s);
  },

  nextId: () => {
    const nums = _services.map(s => parseInt(s.id.replace('SV-', ''), 10)).filter(n => !isNaN(n));
    const max  = nums.length ? Math.max(...nums) : 0;
    return `SV-${String(max + 1).padStart(3, '0')}`;
  },
};

// ─── Packages store ───────────────────────────────────────────
let _packages: Package[] = [...mockPackages];

export const packageStore = {
  getAll:      ()            => _packages,
  getById:     (id: string)  => _packages.find(p => p.id === id) ?? null,
  save: (pkg: Package) => {
    const idx = _packages.findIndex(p => p.id === pkg.id);
    if (idx >= 0) _packages = _packages.map(p => p.id === pkg.id ? pkg : p);
    else _packages = [..._packages, pkg];
  },
  delete:       (id: string) => { _packages = _packages.filter(p => p.id !== id); },
  toggleActive: (id: string) => {
    _packages = _packages.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p);
  },
  nextId: () => {
    const nums = _packages.map(p => parseInt(p.id.replace('PKG-', ''), 10)).filter(n => !isNaN(n));
    const max  = nums.length ? Math.max(...nums) : 0;
    return `PKG-${String(max + 1).padStart(3, '0')}`;
  },
};
