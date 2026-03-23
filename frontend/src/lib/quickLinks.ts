export type QuickLink = {
  id: string;
  title: string;
  description: string;
  icon: string;
  href: string;
};

export const QUICK_LINKS: QuickLink[] = [
  {
    id: "operations-overview",
    title: "Operations Overview",
    description: "Operations",
    icon: "🧭",
    href: "/operations",
  },
  {
    id: "transactions-overview",
    title: "Transactions Overview",
    description: "Transactions",
    icon: "🔁",
    href: "/transactions",
  },
  {
    id: "finance-overview",
    title: "Finance Overview",
    description: "Finance & Compliance",
    icon: "💼",
    href: "/finance",
  },
  {
    id: "catalog-categories",
    title: "Catalog Categories",
    description: "Manage categories",
    icon: "🗂️",
    href: "/catalog/categories",
  },
  {
    id: "measurement-units",
    title: "Measurement Units",
    description: "Measure conversions",
    icon: "📏",
    href: "/inventory",
  },
  {
    id: "supplier-orders",
    title: "Purchase Orders",
    description: "Supplier orders",
    icon: "📋",
    href: "/purchases",
  },
  {
    id: "customer-orders",
    title: "Sales Orders",
    description: "Customer orders",
    icon: "🛒",
    href: "/sales",
  },
  {
    id: "stock-in",
    title: "Add Inventory",
    description: "Stock in",
    icon: "📦",
    href: "/inventory",
  },
  {
    id: "reports",
    title: "View Reports",
    description: "Analytics",
    icon: "📊",
    href: "/reports",
  },
  {
    id: "team",
    title: "Manage Users",
    description: "Team",
    icon: "👥",
    href: "/roles",
  },
  {
    id: "settings",
    title: "System Settings",
    description: "Config",
    icon: "⚙️",
    href: "/settings",
  },
];


