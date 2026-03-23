"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || authToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    const url = new URL(`${API_BASE_URL}/production/bom-items/${params.id}`);
    if (companyId) {
      url.searchParams.append("company_id", companyId);
    }

    const response = await fetch(url.toString(), {
      method: "PUT",
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
        { error: errorText || "Failed to update BOM item" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error updating BOM item:", error);
    return NextResponse.json(
      { error: "Failed to update BOM item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const authToken = cookieStore.get("auth_token")?.value;
    
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || authToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const companyId = searchParams.get("companyId");

    const url = new URL(`${API_BASE_URL}/production/bom-items/${params.id}`);
    if (companyId) {
      url.searchParams.append("company_id", companyId);
    }

    const response = await fetch(url.toString(), {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error:", errorText);
      return NextResponse.json(
        { error: errorText || "Failed to delete BOM item" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error deleting BOM item:", error);
    return NextResponse.json(
      { error: "Failed to delete BOM item" },
      { status: 500 }
    );
  }
}

