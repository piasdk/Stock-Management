"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(request: NextRequest) {
  try {
    // Read token from Authorization header first (more reliable), then fall back to cookies
    const authHeaderFromRequest = request.headers.get("authorization") || 
                                  request.headers.get("Authorization");
    
    let authToken: string | null = null;
    if (authHeaderFromRequest) {
      // Extract token from "Bearer <token>" format
      authToken = authHeaderFromRequest.startsWith("Bearer ") 
        ? authHeaderFromRequest.substring(7) 
        : authHeaderFromRequest;
    }
    
    // Fall back to cookie if no Authorization header
    if (!authToken) {
      try {
        const cookieStore = await cookies();
        authToken = cookieStore.get("auth_token")?.value || null;
      } catch (cookieError) {
        // Cookie reading might fail in some contexts, that's okay
        console.warn("Could not read cookie:", cookieError);
      }
    }

    const authHeader = authToken ? `Bearer ${authToken}` : null;

    if (!authHeader) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const productId = searchParams.get("productId");
    const locationId = searchParams.get("locationId");

    const url = new URL(`${API_BASE_URL}/inventory/stock-levels`);
    if (companyId) url.searchParams.set("companyId", companyId);
    if (productId) url.searchParams.set("productId", productId);
    if (locationId) url.searchParams.set("locationId", locationId);

    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to fetch stock levels (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Stock levels fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching stock levels" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Read token from Authorization header first (more reliable), then fall back to cookies
    const authHeaderFromRequest = request.headers.get("authorization") || 
                                  request.headers.get("Authorization");
    
    let authToken: string | null = null;
    if (authHeaderFromRequest) {
      // Extract token from "Bearer <token>" format
      authToken = authHeaderFromRequest.startsWith("Bearer ") 
        ? authHeaderFromRequest.substring(7) 
        : authHeaderFromRequest;
    }
    
    // Fall back to cookie if no Authorization header
    if (!authToken) {
      try {
        const cookieStore = await cookies();
        authToken = cookieStore.get("auth_token")?.value || null;
      } catch (cookieError) {
        // Cookie reading might fail in some contexts, that's okay
        console.warn("Could not read cookie:", cookieError);
      }
    }

    const authHeader = authToken ? `Bearer ${authToken}` : null;

    if (!authHeader) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/inventory/stock-levels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to create stock level (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Stock level create error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating stock level" },
      { status: 500 },
    );
  }
}