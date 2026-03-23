"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    const authHeader =
      (authToken ? `Bearer ${authToken}` : null) ||
      request.headers.get("authorization") ||
      null;

    const response = await fetch(`${API_BASE_URL}/accounting/dashboard-overview`, {
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to fetch accountant overview (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Accountant overview fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching accountant overview" },
      { status: 500 },
    );
  }
}


