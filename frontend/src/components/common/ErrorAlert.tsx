"use client";

import React from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorAlertProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  className?: string;
  variant?: "default" | "destructive" | "warning";
}

export function ErrorAlert({
  title = "Error",
  message,
  onDismiss,
  className = "",
  variant = "destructive",
}: ErrorAlertProps) {
  const variantStyles = {
    default: "bg-blue-50 border-blue-200 text-blue-800",
    destructive: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  };

  const iconStyles = {
    default: "text-blue-600",
    destructive: "text-red-600",
    warning: "text-yellow-600",
  };

  return (
    <div
      className={`rounded-lg border-2 ${variantStyles[variant]} p-4 shadow-sm ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${iconStyles[variant]}`}>
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold mb-1">{title}</h3>
          <p className="text-sm leading-relaxed break-words">{message}</p>
        </div>
        {onDismiss && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className={`flex-shrink-0 h-6 w-6 p-0 ${iconStyles[variant]} hover:bg-transparent hover:opacity-70`}
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

