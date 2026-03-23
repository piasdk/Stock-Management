"use server";

import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authToken = request.headers.get("authorization");
  const body = await request.json();

  try {
    const response = await fetch(
      `${API_BASE_URL}/inventory/stock-levels/${id}/adjust`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { authorization: authToken } : {}),
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to adjust stock level (status ${response.status})`,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Stock level adjust error:", error);
    return NextResponse.json(
      { error: "Unexpected error adjusting stock level" },
      { status: 500 }
    );
  }
}

