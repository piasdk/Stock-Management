import * as React from "react";

type Variant = "default" | "ghost" | "outline" | "secondary" | "destructive";
type Size = "default" | "sm" | "md" | "lg" | "icon";

const baseClasses =
  "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const variantClasses: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  ghost: "bg-transparent hover:bg-foreground/10 text-foreground border border-transparent",
  outline: "bg-transparent border border-border/60 text-foreground hover:bg-foreground/5",
  secondary: "bg-foreground/5 text-foreground hover:bg-foreground/10 border border-transparent",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 border border-transparent",
};

const sizeClasses: Record<Size, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", type = "button", ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      className={[
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  ),
);
Button.displayName = "Button";

