"use server";

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 400 }
      );
    }

    console.log("Validating invitation token:", token.substring(0, 20) + "...");

    const response = await fetch(`${BACKEND_URL}/invitations/validate/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });

    let data: any = {};
    try {
      const text = await response.text();
      if (text && text.trim()) {
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("Error parsing JSON response:", parseError);
          console.error("Response text:", text);
          data = { error: `Invalid JSON response: ${text.substring(0, 100)}` };
        }
      }
    } catch (readError) {
      console.error("Error reading response:", readError);
      data = { error: "Failed to read server response" };
    }

    if (!response.ok) {
      console.error("Backend validation failed:", response.status, data);
      return NextResponse.json(
        { error: data.error || data.message || "Invalid invitation" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status || 200 });
  } catch (error) {
    console.error("Error validating invitation:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

