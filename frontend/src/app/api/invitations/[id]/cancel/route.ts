"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get auth header from request (client sends Authorization header)
    const authHeader = request.headers.get("authorization") || 
                       request.headers.get("Authorization");
    
    // Fallback to cookie if header not present
    let finalAuthHeader = authHeader;
    if (!finalAuthHeader) {
      const cookieStore = await cookies();
      const authToken = cookieStore.get("auth_token")?.value;
      finalAuthHeader = authToken ? `Bearer ${authToken}` : null;
    }

    if (!finalAuthHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const response = await fetch(`${BACKEND_URL}/invitations/${id}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: finalAuthHeader,
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to cancel invitation" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error cancelling invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

