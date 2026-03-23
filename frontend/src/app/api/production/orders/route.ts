"use server";

import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    const response = await fetch(`${API_BASE_URL}/production/orders`, {
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Backend returned non-OK status:", response.status, data);
      // Return empty array instead of error to prevent frontend crashes
      return NextResponse.json([]);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Production orders fetch error:", error);
    // Return empty array instead of error to prevent frontend crashes
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/production/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Backend returned non-OK status:", response.status, data);
      return NextResponse.json(
        { error: data?.error || `Failed to create production order (status ${response.status})` },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Production order creation error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating production order" },
      { status: 500 }
    );
  }
}

