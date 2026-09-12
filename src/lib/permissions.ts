import type { RolePermission } from './auth';

export function canAccessRoute(pathname: string, permissions?: RolePermission[] | null) {
  if (!permissions?.length) return true;
  return permissions.some((permission) => permission.view && permission.routes.some((route) => pathname === route || pathname.startsWith(`${route}/`)));
}

export function canAccessPermission(key: string, permissions?: RolePermission[] | null) {
  if (!permissions?.length) return true;
  return permissions.some((permission) => permission.key === key && permission.view);
}
