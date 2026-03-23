"use server";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(request: NextRequest) {
  try {
    const incomingAuthHeader = request.headers.get("authorization");
    const cookieStore = cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    const finalAuthHeader = incomingAuthHeader || (authToken ? `Bearer ${authToken}` : null);

    if (!finalAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: finalAuthHeader,
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch profile" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Auth me proxy error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

