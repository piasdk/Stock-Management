"use server";

import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(request: NextRequest) {
  try {
    const authToken = request.headers.get("authorization");
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const isActive = searchParams.get("isActive") || "all";

    const url = new URL(`${API_BASE_URL}/suppliers`);
    if (companyId) url.searchParams.set("companyId", companyId);
    if (isActive) url.searchParams.set("isActive", isActive);

    const response = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: authToken } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to fetch suppliers (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Suppliers fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching suppliers" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const authToken = request.headers.get("authorization");

    const response = await fetch(`${API_BASE_URL}/suppliers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { authorization: authToken } : {}),
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
            `Failed to create supplier (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Supplier creation error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating supplier" },
      { status: 500 },
    );
  }
}
