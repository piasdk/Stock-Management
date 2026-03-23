"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    const authHeader = authToken ? `Bearer ${authToken}` : null;

    // Call backend logout endpoint
    if (authHeader) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          authorization: authHeader,
        },
      }).catch(() => {
        // Ignore errors, logout should work even if backend call fails
      });
    }

    // Clear the auth cookie
    cookieStore.delete("auth_token");

    return NextResponse.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    // Still clear the cookie even if there's an error
    const cookieStore = await cookies();
    cookieStore.delete("auth_token");
    return NextResponse.json({ message: "Logged out successfully" });
  }
}


