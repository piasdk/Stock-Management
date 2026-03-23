"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import { ROUTES } from "@/lib/constants";
import { clearAuth as clearAuthLib } from "@/lib/auth";

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarOpen: boolean;
}

type IconProps = React.SVGAttributes<SVGSVGElement>;

const MenuIcon = ({ className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <line x1={4} y1={6} x2={20} y2={6} />
    <line x1={4} y1={12} x2={20} y2={12} />
    <line x1={4} y1={18} x2={20} y2={18} />
  </svg>
);

const BellIcon = ({ className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const SettingsIcon = ({ className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V22a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H8a1.65 1.65 0 0 0 1-1.51V2a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V8a1.65 1.65 0 0 0 1.51 1H22a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoutIcon = ({ className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1={21} y1={12} x2={9} y2={12} />
  </svg>
);

const UserIcon = ({ className, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx={12} cy={7} r={4} />
  </svg>
);

const NOTIFICATION_STORAGE_KEY = "notifications_enabled";

export function TopBar({ onToggleSidebar, sidebarOpen }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { clearAuth: storeClearAuth, user } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const signOutButtonRef = useRef<HTMLButtonElement>(null);

  // Get page title based on current route
  const getPageTitle = () => {
    if (pathname === '/operations') {
      return 'Operations Dashboard';
    }
    if (pathname === '/inventory/all') {
      return 'All Inventory';
    }
    if (pathname === '/dashboard') {
      return 'Dashboard';
    }
    if (pathname === '/inventory') {
      return 'Inventory';
    }
    if (pathname?.startsWith('/products')) {
      return 'Products';
    }
    if (pathname?.startsWith('/sales')) {
      return 'Sales';
    }
    if (pathname?.startsWith('/purchases')) {
      return 'Purchases';
    }
    if (pathname?.startsWith('/customers')) {
      return 'Customers';
    }
    if (pathname?.startsWith('/suppliers')) {
      return 'Suppliers';
    }
    // Default fallback
    return 'Dashboard';
  };

  // Load notification preference from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (saved !== null) {
        setNotificationsEnabled(saved === "true");
      }
    }
  }, []);

  // Attach direct event listener to sign out button as fallback
  useEffect(() => {
    const attachListener = () => {
      const button = document.getElementById("sign-out-button") as HTMLButtonElement;
      if (!button) {
        return false;
      }

      console.log("Sign out button found in DOM, attaching direct listener");
      const handleDirectClick = (e: MouseEvent) => {
        console.log("=== DIRECT CLICK LISTENER FIRED ===");
        e.preventDefault();
        e.stopImmediatePropagation();
        
        // Clear auth
        storeClearAuth();
        clearAuthLib();
        
        // Call logout API
        fetch("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        }).catch(() => {});
        
        // Redirect
        console.log("Redirecting to login");
        window.location.replace(ROUTES.LOGIN);
      };

      button.addEventListener("click", handleDirectClick, true);

      return () => {
        button.removeEventListener("click", handleDirectClick, true);
      };
    };

    // Try immediately
    const cleanup = attachListener();
    if (cleanup) {
      return cleanup;
    }

    // If not found, try again after a short delay (dropdown might be closed)
    const timeoutId = setTimeout(() => {
      attachListener();
    }, 500);

    // Also use MutationObserver to watch for when button appears
    const observer = new MutationObserver(() => {
      attachListener();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
      if (cleanup) cleanup();
    };
  }, [storeClearAuth]);

  // Close notification menu when clicking outside
  useEffect(() => {
    if (!showNotificationMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Don't close if clicking inside the menu
      if (
        notificationMenuRef.current &&
        notificationMenuRef.current.contains(target)
      ) {
        return;
      }
      
      // Don't close if clicking the notification button (toggle behavior)
      if (
        notificationButtonRef.current &&
        notificationButtonRef.current.contains(target)
      ) {
        // Toggle menu instead of closing
        return;
      }
      
      // Close if clicking outside
      setShowNotificationMenu(false);
    };

    // Use a slight delay to allow click events to process first
    const timeoutId = setTimeout(() => {
      document.addEventListener("click", handleClickOutside, true);
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [showNotificationMenu]);

  const handleLogout = (e: React.MouseEvent) => {
    console.log("=== LOGOUT FUNCTION CALLED ===");
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("Clearing auth store...");
    // Clear from Zustand store (this also clears localStorage)
    storeClearAuth();
    console.log("Store cleared");
    
    console.log("Clearing lib auth...");
    // Also clear from lib/auth to ensure everything is cleared
    clearAuthLib();
    console.log("Lib auth cleared");
    
    // Call logout API (fire and forget, don't wait)
    console.log("Calling logout API...");
    fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    }).catch((err) => {
      console.log("Logout API error (ignored):", err);
    });
    
    console.log("Redirecting to login page:", ROUTES.LOGIN);
    
    // Force hard navigation immediately
    if (typeof window !== "undefined") {
      console.log("Using window.location.replace");
      window.location.replace(ROUTES.LOGIN);
    } else {
      console.error("Window is undefined!");
    }
  };

  const handleNotificationToggle = () => {
    console.log("Notification toggle clicked, current state:", notificationsEnabled);
    const newValue = !notificationsEnabled;
    setNotificationsEnabled(newValue);
    if (typeof window !== "undefined") {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, String(newValue));
      console.log("Notification preference saved:", newValue);
    }
    // Don't auto-close menu - let user close it manually or click outside
  };

  const handleProfileClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    router.push(ROUTES.PROFILE);
  };

  const handlePreferencesClick = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    router.push(ROUTES.SETTINGS);
  };

  return (
    <div className="flex h-16 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="relative text-foreground/70 hover:text-foreground"
          aria-pressed={sidebarOpen}
          aria-label="Toggle sidebar"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
        <h2 className="text-base sm:text-lg font-semibold text-foreground">{getPageTitle()}</h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative">
          <Button
            ref={notificationButtonRef}
            variant="ghost"
            size="icon"
            className="relative text-foreground/70 hover:text-foreground"
            aria-label="Notifications"
            onClick={() => setShowNotificationMenu(!showNotificationMenu)}
          >
            <BellIcon className="h-5 w-5" />
            {notificationsEnabled && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
          {showNotificationMenu && (
            <div
              ref={notificationMenuRef}
              className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-card shadow-lg"
              data-dropdown="content"
            >
              <div className="py-1">
                <div className="px-3 py-2 text-sm font-semibold text-foreground">
                  Notifications
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("Notification button clicked");
                    handleNotificationToggle();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="flex w-full items-center justify-between px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted active:bg-muted/80 cursor-pointer border-0 bg-transparent rounded-md"
                >
                  <span>{notificationsEnabled ? "Disable Notifications" : "Enable Notifications"}</span>
                  <div
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${
                      notificationsEnabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    role="switch"
                    aria-checked={notificationsEnabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-md ${
                        notificationsEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </div>
                </button>
                <div className="px-3 py-2 text-xs text-foreground/60">
                  {notificationsEnabled
                    ? "You will receive notifications"
                    : "You will not receive notifications"}
                </div>
              </div>
            </div>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground/70 hover:text-foreground"
              aria-label="User menu"
            >
              <UserIcon className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleProfileClick(e);
              }}
            >
              <UserIcon className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePreferencesClick(e);
              }}
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Preferences</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div
              className="px-3 py-1"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <button
                ref={signOutButtonRef}
                type="button"
                id="sign-out-button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:text-red-800 cursor-pointer transition-colors rounded-md"
                onClick={(e) => {
                  console.log("=== SIGN OUT BUTTON CLICKED (React onClick) ===");
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.nativeEvent) {
                    e.nativeEvent.stopImmediatePropagation();
                  }
                  console.log("Event stopped, calling handleLogout");
                  handleLogout(e);
                }}
                onMouseDown={(e) => {
                  console.log("Sign out mousedown");
                  e.stopPropagation();
                }}
                onMouseUp={(e) => {
                  console.log("Sign out mouseup");
                  e.stopPropagation();
                }}
                style={{ cursor: "pointer", pointerEvents: "auto", zIndex: 9999 }}
              >
                <LogoutIcon className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

