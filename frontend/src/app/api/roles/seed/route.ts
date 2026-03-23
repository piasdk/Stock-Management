"use server";

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function POST(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_URL}/roles/seed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to seed roles" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status || 201 });
  } catch (error) {
    console.error("Error seeding roles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

