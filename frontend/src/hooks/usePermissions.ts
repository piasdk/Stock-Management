"use client";

import { useMemo } from "react";
import { getUser, isSuperAdmin, isCompanyAdmin, isBranchAdmin } from "@/lib/auth";

/**
 * Hook to check user permissions
 */
export function usePermissions() {
  const user = getUser();

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      // Super admin has all permissions
      if (isSuperAdmin(user)) return true;
      
      // Company admin has all permissions for their company
      if (isCompanyAdmin(user)) return true;
      
      // Branch admin has all permissions for their branch
      if (isBranchAdmin(user)) return true;
      
      // TODO: Check role-based permissions from API
      // For now, return false for regular users
      return false;
    };
  }, [user]);

  const hasAnyPermission = useMemo(() => {
    return (permissions: string[]): boolean => {
      return permissions.some((perm) => hasPermission(perm));
    };
  }, [hasPermission]);

  const hasAllPermissions = useMemo(() => {
    return (permissions: string[]): boolean => {
      return permissions.every((perm) => hasPermission(perm));
    };
  }, [hasPermission]);

  return {
    user,
    isSuperAdmin: isSuperAdmin(user),
    isCompanyAdmin: isCompanyAdmin(user),
    isBranchAdmin: isBranchAdmin(user),
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}

