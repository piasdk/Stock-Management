"use client";

import { ErrorAlert } from "./ErrorAlert";

interface ErrorMessageProps {
  error: string | null;
  className?: string;
  onDismiss?: () => void;
  title?: string;
}

export function ErrorMessage({
  error,
  className = "",
  onDismiss,
  title = "Error",
}: ErrorMessageProps) {
  if (!error) return null;

  return (
    <ErrorAlert
      title={title}
      message={error}
      onDismiss={onDismiss}
      className={className}
      variant="destructive"
    />
  );
}

