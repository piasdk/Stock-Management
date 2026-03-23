"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamically import components to avoid SSR issues
const LoginForm = dynamic(() => import("./LoginForm"), { ssr: false });

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return <LoginForm />;
}
