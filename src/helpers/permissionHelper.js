import { useAuthStore } from '@/stores/auth';

export const can = permission => {
  const authStore = useAuthStore();

  const userPermissions = authStore.user?.permissions || [];

  return userPermissions.includes(permission);
};

export const canOneOf = permissions => {
  const authStore = useAuthStore();

  const userPermissions = authStore.user?.permissions || [];

  if (!permissions || permissions.length === 0) {
    return false;
  }

  return permissions.some(permission => userPermissions.includes(permission));
};

// Some destructive actions (e.g. deleting a real record from a Report/
// History screen) are gated by role rather than the regular permission
// system, matching the backend's RoleMiddleware checks on those routes.
export const hasAnyRole = roles => {
  const authStore = useAuthStore();

  const userRoles = authStore.user?.roles || [];

  if (!roles || roles.length === 0) {
    return false;
  }

  return roles.some(role => userRoles.includes(role));
};
