"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ count_id: string }> }
) {
  try {
    const { count_id } = await params;
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    const authHeader = request.headers.get("authorization") ||
      (authToken ? `Bearer ${authToken}` : null);

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(
      `${API_BASE_URL}/operations/physical-counts/${encodeURIComponent(count_id)}/complete`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          authorization: authHeader,
        },
        body: JSON.stringify({}),
        next: { revalidate: 0 },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to complete physical count" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error("Error completing physical count:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}


