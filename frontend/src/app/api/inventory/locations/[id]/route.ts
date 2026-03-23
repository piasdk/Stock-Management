import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authToken = request.headers.get("authorization");
  const body = await request.json();

  try {
    const response = await fetch(`${API_BASE_URL}/inventory/locations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: authToken } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to update location (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Location update error:", error);
    return NextResponse.json(
      { error: "Unexpected error updating location" },
      { status: 500 },
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
    const response = await fetch(`${API_BASE_URL}/inventory/locations/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: authToken } : {}),
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to delete location (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Location delete error:", error);
    return NextResponse.json(
      { error: "Unexpected error deleting location" },
      { status: 500 },
    );
  }
}





