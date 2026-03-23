"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    const authHeader = authToken ? `Bearer ${authToken}` : null;
    const body = await request.json();
    
    const { id } = await params;

    const response = await fetch(`${API_BASE_URL}/purchases/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to update purchase order (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Purchase update error:", error);
    return NextResponse.json(
      { error: "Unexpected error updating purchase order" },
      { status: 500 },
    );
  }
}

