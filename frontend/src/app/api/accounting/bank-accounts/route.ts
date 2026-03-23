"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    const authHeader = authToken ? `Bearer ${authToken}` : null;

    const response = await fetch(`${API_BASE_URL}/accounting/bank-accounts`, {
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to fetch bank accounts (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Bank accounts fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching bank accounts" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    const authHeader = authToken ? `Bearer ${authToken}` : null;

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/accounting/bank-accounts`, {
      method: "POST",
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
            `Failed to create bank account (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Bank account creation error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating bank account" },
      { status: 500 },
    );
  }
}

