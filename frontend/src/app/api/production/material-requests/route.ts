"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    
    // Also check Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || authToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    const url = new URL(`${API_BASE_URL}/production/material-requests`);
    if (companyId) {
      url.searchParams.append("company_id", companyId);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const data = await response.json();
    // Ensure data is always an array
    const materialRequests = Array.isArray(data) ? data : [];
    return NextResponse.json({ data: materialRequests });
  } catch (error) {
    console.error("Error fetching material requests:", error);
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    
    // Also check Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || authToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    const url = new URL(`${API_BASE_URL}/production/material-requests`);
    if (companyId) {
      url.searchParams.append("company_id", companyId);
    }

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      return NextResponse.json(
        { error: errorText || "Failed to create material request" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Error creating material request:", error);
    return NextResponse.json(
      { error: "Failed to create material request" },
      { status: 500 }
    );
  }
}

