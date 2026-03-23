"use server";

import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;
    
    console.log(`[Suppliers API] PUT request for supplier ID: ${id}`);
    
    const body = await request.json();
    const authToken = request.headers.get("authorization");

    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: authToken } : {}),
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[Suppliers API] PUT failed: ${response.status}`, data);
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to update supplier (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    console.log(`[Suppliers API] PUT success for supplier ID: ${id}`);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Suppliers API] PUT error:", error);
    return NextResponse.json(
      { error: "Unexpected error updating supplier" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = resolvedParams.id;
    
    console.log(`[Suppliers API] DELETE request for supplier ID: ${id}`);
    
    const authToken = request.headers.get("authorization");

    const response = await fetch(`${API_BASE_URL}/suppliers/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: authToken } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[Suppliers API] DELETE failed: ${response.status}`, data);
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to delete supplier (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    console.log(`[Suppliers API] DELETE success for supplier ID: ${id}`);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Suppliers API] DELETE error:", error);
    return NextResponse.json(
      { error: "Unexpected error deleting supplier" },
      { status: 500 },
    );
  }
}
