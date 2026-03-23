"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(request: NextRequest) {
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

    const response = await fetch(`${BACKEND_URL}/invitations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: finalAuthHeader,
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Failed to fetch invitations" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    console.log("Invitation API route - Request body:", body);
    console.log("Invitation API route - Auth header present:", !!finalAuthHeader);

    const response = await fetch(`${BACKEND_URL}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: finalAuthHeader,
      },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });

    let data: any = {};
    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
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
      } else {
        const text = await response.text();
        data = { error: text || response.statusText || "Unknown error" };
      }
    } catch (error) {
      console.error("Error reading response:", error);
      data = { error: "Failed to read server response" };
    }

    console.log("Invitation API route - Backend response status:", response.status);
    console.log("Invitation API route - Backend response data:", data);

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || data.message || "Failed to create invitation" },
        { status: response.status || 500 }
      );
    }

    return NextResponse.json(data, { status: response.status || 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

