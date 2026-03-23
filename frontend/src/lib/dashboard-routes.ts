/**
 * Dashboard Routing Utilities
 * Maps each user role to their specific dashboard route
 */

import { ROLE_CODES } from "./constants";

export interface User {
  role_code?: string | null;
  role_name?: string | null;
  is_super_admin?: boolean;
  is_company_admin?: boolean;
  is_branch_admin?: boolean;
}

/**
 * Get the dashboard route for a specific user role
 */
export function getDashboardRoute(user: User | null | undefined): string {
  if (!user) {
    return "/dashboard";
  }

  // Super Admin Dashboard
  // IMPORTANT: treat "super admin" as a true platform admin ONLY when the user has is_super_admin=true.
  // Some deployments historically used role_code="super_admin" for company admins; those users should land
  // on the Company Admin dashboard, not the platform-wide Super Admin dashboard.
  if (user.is_super_admin) {
    return "/dashboard/super-admin";
  }

  // Company Admin Dashboard
  if (
    (user.is_company_admin && !user.is_super_admin) ||
    user.role_code === ROLE_CODES.COMPANY_ADMIN ||
    // Back-compat: role_code "super_admin" should behave like company admin unless is_super_admin=true
    user.role_code === ROLE_CODES.SUPER_ADMIN
  ) {
    return "/dashboard/company-admin";
  }

  // Check role_code first (Manager, Accountant, Production Supervisor) before checking admin flags
  // Manager Dashboard
  if (user.role_code === ROLE_CODES.MANAGER) {
    return "/dashboard/manager";
  }

  // Accountant Dashboard (prioritize accountant role over branch_admin flag)
  if (user.role_code === ROLE_CODES.ACCOUNTANT) {
    return "/dashboard/accountant";
  }

  // Production Supervisor Dashboard (prioritize production supervisor role over branch_admin flag)
  // Check both exact match and case-insensitive match, and also check role_name as fallback
  const roleCodeLower = user.role_code?.toLowerCase();
  const roleNameLower = (user as any).role_name?.toLowerCase() || '';
  const productionSupervisorCodes = [
    ROLE_CODES.PRODUCTION_SUPERVISOR.toLowerCase(),
    'production_supervisor',
    'production supervisor',
    'production-supervisor',
    'supervisor' // Also handle "supervisor" role code
  ];
  const productionSupervisorNames = [
    'production supervisor',
    'supervisor', // Handle "Supervisor" role name
    'production_supervisor'
  ];
  
  // Check role_code first
  if (user.role_code === ROLE_CODES.PRODUCTION_SUPERVISOR || 
      (roleCodeLower && productionSupervisorCodes.includes(roleCodeLower))) {
    return "/dashboard/production-supervisor";
  }
  
  // Then check role_name (case-insensitive)
  if (roleNameLower && productionSupervisorNames.some(name => roleNameLower.includes(name))) {
    return "/dashboard/production-supervisor";
  }

  // Branch Admin Dashboard (branch admin role or flag; company admin also uses same dashboard)
  if (user.role_code === ROLE_CODES.BRANCH_ADMIN) {
    return "/dashboard/branch-admin";
  }
  const hasOtherSpecificRole = (user.role_code && user.role_code !== ROLE_CODES.BRANCH_ADMIN) || (user as any).role_name;
  if (user.is_branch_admin && !user.is_company_admin && !user.is_super_admin && !hasOtherSpecificRole) {
    return "/dashboard/branch-admin";
  }

  // Default fallback
  return "/dashboard";
}

/**
 * Check if a user should see a specific dashboard
 */
export function shouldSeeDashboard(
  user: User | null | undefined,
  dashboardRoute: string,
): boolean {
  if (!user) return false;

  const userDashboard = getDashboardRoute(user);
  if (userDashboard === dashboardRoute) return true;
  // Company Admin and Branch Admin share the same dashboard UI
  if ((dashboardRoute === "/dashboard/company-admin" || dashboardRoute === "/dashboard/branch-admin") &&
      (userDashboard === "/dashboard/company-admin" || userDashboard === "/dashboard/branch-admin")) {
    return true;
  }
  return false;
}

