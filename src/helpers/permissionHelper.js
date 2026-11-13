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

export const hasAnyRole = roles => {
  const authStore = useAuthStore();

  const userRoles = authStore.user?.roles || [];

  if (!roles || roles.length === 0) {
    return false;
  }

  return roles.some(role => userRoles.includes(role));
};
