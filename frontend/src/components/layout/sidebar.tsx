"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { ROUTES, ROLE_CODES } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { getDashboardRoute } from "@/lib/dashboard-routes";

const cn = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

type Module = {
  id: string;
  label: string;
  items: Array<{
    id: string;
    label: string;
    icon: string;
    href: string;
  }>;
};

const modules: Module[] = [
  {
    id: "core",
    label: "Core",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "📊", href: "/dashboard" },
      { id: "companies", label: "Branches", icon: "🏢", href: "/companies" },
      { id: "invitations", label: "Invitations", icon: "✉️", href: "/invitations" },
      { id: "branch-invitations", label: "Invitations", icon: "📨", href: "/branch/invitations" },
      { id: "roles", label: "Roles", icon: "🛡️", href: "/roles" },
      { id: "branch-roles", label: "Roles", icon: "🛡️", href: "/branch/roles" },
      { id: "profile", label: "Profile", icon: "👤", href: "/profile" },
    ],
  },
    {
      id: "operations",
      label: "Operations",
      items: [
        { id: "products", label: "Products", icon: "📦", href: "/products" },
        { id: "suppliers", label: "Suppliers", icon: "🚚", href: "/suppliers" },
        { id: "customers", label: "Customers", icon: "🛍️", href: "/customers" },
        { id: "inventory", label: "Inventory", icon: "📋", href: "/inventory/all" },
      ],
    },
  {
    id: "transactions",
    label: "Transactions",
    items: [
      { id: "sales", label: "Sales", icon: "💵", href: "/sales" },
      { id: "purchases", label: "Purchases", icon: "🧾", href: "/purchases" },
    ],
  },
  {
    id: "finance",
    label: "Finance & Accounting",
    items: [
      { id: "expenses", label: "Expense Management", icon: "💰", href: "/expenses" },
      { id: "accounting", label: "Accountant Command Center", icon: "📘", href: "/accounting" },
      { id: "bank-reconciliation", label: "Bank Reconciliation", icon: "💳", href: "/accounting/reconciliation" },
      { id: "general-ledger", label: "General Ledger", icon: "📒", href: "/accounting/general-ledger" },
      { id: "chart-of-accounts", label: "Chart of Accounts", icon: "📊", href: "/accounting/chart-of-accounts" },
    ],
  },
  {
    id: "ap-ar",
    label: "AP/AR",
    items: [
      { id: "invoices", label: "Invoices", icon: "📄", href: "/accounting/invoices" },
      { id: "bills", label: "Bills", icon: "📋", href: "/accounting/bills" },
      { id: "payments", label: "Payments", icon: "💸", href: "/accounting/payments" },
    ],
  },
  {
    id: "period-reports",
    label: "Period & Reports",
    items: [
      { id: "period-close", label: "Period Close", icon: "📅", href: "/accounting/period-close" },
      { id: "financial-reports", label: "Financial Reports", icon: "📊", href: "/accounting/reports" },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { id: "preferences", label: "Preferences", icon: "⚙️", href: "/settings/preferences" },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

const DEFAULT_NAME = "Business OS";
const DEFAULT_LOCATION = "Location unavailable";

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    core: true,
    operations: true,
    transactions: true,
    finance: true,
    "ap-ar": true,
    "period-reports": true,
    settings: false,
    insights: false,
  });
  const [companyName, setCompanyName] = useState(DEFAULT_NAME);
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION);

  const branchId = useMemo(() => {
    if (user?.branch_id === null || user?.branch_id === undefined) return null;
    const parsed = Number(user.branch_id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [user?.branch_id]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanyName(companyId: number) {
      try {
        const response = await api.get<{
          company_id: number;
          name: string;
          city?: string;
          state?: string;
          country?: string;
        }>(`/companies/${companyId}`);

        if (cancelled) return;

        if (response.data) {
          setCompanyName(response.data.name || DEFAULT_NAME);
          if (branchId) {
            await loadBranchLocation(companyId, branchId);
          } else {
            const companyLocation = formatLocation(
              response.data.city,
              response.data.state,
              response.data.country,
            );
            setLocationLabel(companyLocation || DEFAULT_LOCATION);
          }
        } else if (response.error) {
          console.warn("Company lookup failed:", response.error);
          setCompanyName(DEFAULT_NAME);
          setLocationLabel(DEFAULT_LOCATION);
        }
      } catch (error) {
        if (cancelled) return;
        console.warn("Company fetch error:", error);
        setCompanyName(DEFAULT_NAME);
        setLocationLabel(DEFAULT_LOCATION);
      }
    }

    async function loadBranchLocation(companyId: number, branch: number) {
      try {
        const response = await api.get<
          Array<{
            branch_id: number;
            name: string;
            city?: string;
            state?: string;
            country?: string;
          }>
        >(`/companies/${companyId}/branches`);

        if (!response.data) {
          if (response.error) {
            console.warn("Branch lookup failed:", response.error);
          }
          setLocationLabel(DEFAULT_LOCATION);
          return;
        }

        const match = response.data.find((item) => item.branch_id === branch);
        if (match) {
          // Set branch name for branch admins
          setCompanyName(match.name || DEFAULT_NAME);
          const branchLocation = formatLocation(
            match.city,
            match.state,
            match.country,
          );
          setLocationLabel(branchLocation || DEFAULT_LOCATION);
        } else {
          setLocationLabel(DEFAULT_LOCATION);
        }
      } catch (error) {
        console.warn("Branch fetch error:", error);
        setLocationLabel(DEFAULT_LOCATION);
      }
    }

    if (user?.company_id) {
      loadCompanyName(user.company_id);
    } else {
      setCompanyName(DEFAULT_NAME);
      setLocationLabel(DEFAULT_LOCATION);
    }

    return () => {
      cancelled = true;
    };
  }, [user?.company_id, branchId]);

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredModules = useMemo<Module[]>(() => {
    const dashboardUrl = getDashboardRoute(user);
    
    if (user?.role_code === ROLE_CODES.ACCOUNTANT) {
      return modules
        .map((module) => {
          if (module.id === "operations" || module.id === "transactions") {
            return null;
          }

          if (module.id === "core") {
            const allowedCoreItems = new Set(["dashboard", "profile"]);
            const coreItems = module.items
              .filter((item) => allowedCoreItems.has(item.id))
              .map((item) => {
                // Update dashboard href for role-based routing
                if (item.id === "dashboard") {
                  return { ...item, href: dashboardUrl };
                }
                return item;
              });
            // Return core items for accountants (no Command Center sub-item)
            return {
              ...module,
              items: coreItems,
            };
          }

          if (
            module.id === "finance" ||
            module.id === "ap-ar" ||
            module.id === "period-reports" ||
            module.id === "settings"
          ) {
            return module;
          }

          return null;
        })
        .filter(Boolean) as Module[];
    }
    
    // For other roles, update dashboard href
    return modules.map((module) => {
      if (module.id === "core") {
        return {
          ...module,
          items: module.items.map((item) => {
            if (item.id === "dashboard") {
              return { ...item, href: dashboardUrl };
            }
            return item;
          }),
        };
      }
      return module;
    });
  }, [user?.role_code, user?.is_branch_admin, user?.is_company_admin, user?.is_super_admin]);

  if (!isOpen) return null;

  return (
    <div className={cn(
      "fixed lg:static inset-y-0 left-0 z-50 h-full w-64 overflow-y-auto border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out",
      isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      <div className="border-b border-sidebar-border p-6">
        <h1 className="text-xl font-semibold text-sidebar-foreground">
          {companyName}
        </h1>
        <p className="mt-1 text-xs text-sidebar-foreground/60">
          {locationLabel}
        </p>
      </div>

      <nav className="p-4">
        {filteredModules.map((module) => (
          <div key={module.id} className="mb-6">
            <button
              type="button"
              onClick={() => toggleSection(module.id)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
            >
              <span>{module.label}</span>
              <svg
                className={cn(
                  "h-4 w-4 transition-transform",
                  expandedSections[module.id] && "rotate-180",
                )}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {expandedSections[module.id] && (
              <div className="mt-2 space-y-1">
                        {module.items
                          .filter((item) => {
                            // Only show invitations to super/company admins
                            if (item.id === "invitations") {
                              return user?.is_super_admin || user?.is_company_admin;
                            }
                            // Show roles to super admins (in core section)
                            if (item.id === "roles") {
                              // Company admins should manage roles within their company.
                              // Also allow back-compat role_code="super_admin" users (treated as company admins in routing).
                              return (
                                user?.is_super_admin ||
                                user?.is_company_admin ||
                                user?.role_code === ROLE_CODES.COMPANY_ADMIN ||
                                user?.role_code === ROLE_CODES.SUPER_ADMIN
                              );
                            }
                            // Show branch invitations and branch roles to branch admins
                            if (item.id === "branch-invitations" || item.id === "branch-roles") {
                              return user?.is_branch_admin && user?.branch_id;
                            }
                            // Show companies/branches only to super/company admins (not branch admins)
                            if (item.id === "companies") {
                              return (user?.is_super_admin || user?.is_company_admin) && (!user?.is_branch_admin || !user?.branch_id);
                            }
                            return true;
                          })
                          .map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-primary",
                        item.label.startsWith("   └─") && "ml-4 text-xs"
                      )}
                    >
                      {item.icon && <span className="text-base">{item.icon}</span>}
                      <span>{item.label}</span>
                    </Link>
                  ))}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

function formatLocation(
  city?: string | null,
  state?: string | null,
  country?: string | null,
) {
  return [city, state, country].filter(Boolean).join(", ");
}

