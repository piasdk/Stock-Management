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
    
    console.log(`[Customers API] PUT request for customer ID: ${id}`);
    
    const body = await request.json();
    const authToken = request.headers.get("authorization");

    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
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
      console.error(`[Customers API] PUT failed: ${response.status}`, data);
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to update customer (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    console.log(`[Customers API] PUT success for customer ID: ${id}`);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Customers API] PUT error:", error);
    return NextResponse.json(
      { error: "Unexpected error updating customer" },
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
    
    console.log(`[Customers API] DELETE request for customer ID: ${id}`);
    
    const authToken = request.headers.get("authorization");

    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: authToken } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[Customers API] DELETE failed: ${response.status}`, data);
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to delete customer (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    console.log(`[Customers API] DELETE success for customer ID: ${id}`);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Customers API] DELETE error:", error);
    return NextResponse.json(
      { error: "Unexpected error deleting customer" },
      { status: 500 },
    );
  }
}

