"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const authHeaderFromRequest = request.headers.get("authorization") ||
                                  request.headers.get("Authorization");

    let authToken: string | null = null;
    if (authHeaderFromRequest) {
      authToken = authHeaderFromRequest.startsWith("Bearer ")
        ? authHeaderFromRequest.substring(7)
        : authHeaderFromRequest;
    }

    if (!authToken) {
      try {
        const cookieStore = await cookies();
        authToken = cookieStore.get("auth_token")?.value || null;
      } catch (cookieError) {
        console.warn("Could not read cookie:", cookieError);
      }
    }

    const authHeader = authToken ? `Bearer ${authToken}` : null;

    if (!authHeader) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const url = `${API_BASE_URL}/operations/inventory/transfer`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to transfer stock (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Transfer stock error:", error);
    return NextResponse.json(
      { error: "Unexpected error transferring stock" },
      { status: 500 },
    );
  }
}

