"use server";

import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authToken = request.headers.get("authorization");

  try {
    const response = await fetch(
      `${API_BASE_URL}/inventory/stock-levels/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { authorization: authToken } : {}),
        },
        next: { revalidate: 0 },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to fetch stock level (status ${response.status})`,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Stock level fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching stock level" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authToken = request.headers.get("authorization");
  const body = await request.json();

  try {
    const response = await fetch(
      `${API_BASE_URL}/inventory/stock-levels/${id}`,
      {
        method: "PUT",
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
            `Failed to update stock level (status ${response.status})`,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Stock level update error:", error);
    return NextResponse.json(
      { error: "Unexpected error updating stock level" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authToken = request.headers.get("authorization");

  try {
    const response = await fetch(
      `${API_BASE_URL}/inventory/stock-levels/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { authorization: authToken } : {}),
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to delete stock level (status ${response.status})`,
        },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Stock level delete error:", error);
    return NextResponse.json(
      { error: "Unexpected error deleting stock level" },
      { status: 500 }
    );
  }
}


