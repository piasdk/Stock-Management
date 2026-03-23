/**
 * Application Constants
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const ROUTES = {
  // Auth
  LOGIN: "/login",
  REGISTER: "/register",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  ACCEPT_INVITATION: "/accept-invitation",
  INVITATIONS: "/invitations",
  
  // Dashboard
  DASHBOARD: "/dashboard",
  PRODUCTS: "/products",
  INVENTORY: "/inventory",
  SALES: "/sales",
  PURCHASES: "/purchases",
  CUSTOMERS: "/customers",
  SUPPLIERS: "/suppliers",
  COMPANIES: "/companies",
  EXPENSES: "/expenses",
  ACCOUNTING: "/accounting",
  REPORTS: "/reports",
  SETTINGS: "/settings",
  PROFILE: "/profile",
  ROLES: "/roles",
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token",
  USER: "user",
  COMPANY: "company",
  BRANCH: "branch",
} as const;

export const USER_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
  PENDING_INVITATION: "pending_invitation",
  INVITED: "invited",
} as const;

export const ROLE_CODES = {
  SUPER_ADMIN: "super_admin",
  COMPANY_ADMIN: "company_admin",
  BRANCH_ADMIN: "branch_admin",
  MANAGER: "manager",
  ACCOUNTANT: "accountant",
  PRODUCTION_SUPERVISOR: "production_supervisor",
} as const;

