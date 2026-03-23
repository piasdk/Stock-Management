import * as React from "react";

interface DropdownContextValue {
  open: boolean;
  toggle: () => void;
  close: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

const useDropdown = () => {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within <DropdownMenu>");
  }
  return context;
};

export interface DropdownMenuProps {
  children: React.ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const close = React.useCallback(() => setOpen(false), []);
  const toggle = React.useCallback(() => setOpen((value) => !value), []);

  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const contentElement = document.querySelector('[data-dropdown="content"]');
      
      // Don't close if clicking inside the dropdown content
      if (contentElement && contentElement.contains(target)) {
        return;
      }
      
      // Don't close if clicking the trigger button
      if (triggerRef.current && triggerRef.current.contains(target)) {
        return;
      }
      
      // Close if clicking outside
      close();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    // Use a slight delay to allow click events to process first
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 100);

    document.addEventListener("keydown", handleEscape);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open, close]);

  return (
    <DropdownContext.Provider
      value={{ open, toggle, close, triggerRef }}
    >
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  );
}

export interface DropdownMenuTriggerProps {
  children: React.ReactElement;
  asChild?: boolean;
}

export function DropdownMenuTrigger({
  children,
}: DropdownMenuTriggerProps) {
  const { toggle, triggerRef } = useDropdown();

  return React.cloneElement(children, {
    ref: triggerRef,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
      children.props.onClick?.(event);
      toggle();
    },
  });
}

export interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "end";
}

export function DropdownMenuContent({
  className,
  children,
  align = "start",
  ...props
}: DropdownMenuContentProps) {
  const { open, close, triggerRef } = useDropdown();

  const [styles, setStyles] = React.useState<React.CSSProperties>({});

  React.useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setStyles({
      minWidth: rect.width,
      right: align === "end" ? 0 : undefined,
      left: align === "start" ? 0 : undefined,
    });
  }, [open, align, triggerRef]);

  if (!open) return null;

  return (
    <div
      className={[
        "absolute z-50 mt-2 w-48 rounded-md border border-border bg-card shadow-lg",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={styles}
      role="menu"
      tabIndex={-1}
      data-dropdown="content"
      {...props}
    >
      <div className="py-1">
        {children}
      </div>
    </div>
  );
}

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function DropdownMenuItem({
  className,
  children,
  onClick,
  ...props
}: DropdownMenuItemProps) {
  const { close } = useDropdown();
  
  // Check if this is a logout action (has red or destructive class)
  const isLogout = className?.includes("text-red-600") || className?.includes("text-destructive");
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log("DropdownMenuItem handleClick called, isLogout:", isLogout);
    
    // For logout, call onClick immediately and don't prevent default/stop propagation
    // This allows the logout handler to work properly
    if (isLogout) {
      console.log("Logout item - calling onClick directly");
      if (onClick) {
        onClick(e);
      }
      // Don't close menu, don't prevent default - let logout handler do its thing
      return;
    }
    
    // For other items, prevent default and handle normally
    e.preventDefault();
    e.stopPropagation();
    
    // Always call the onClick handler
    if (onClick) {
      onClick(e);
    }
    
    // Close menu after a short delay to allow navigation to execute
    setTimeout(() => {
      close();
    }, 150);
  };
  
  return (
    <button
      type="button"
      role="menuitem"
      className={[
        "flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground transition-colors cursor-pointer",
        isLogout ? "hover:text-red-800" : "hover:bg-muted",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-border" role="separator" />;
}

