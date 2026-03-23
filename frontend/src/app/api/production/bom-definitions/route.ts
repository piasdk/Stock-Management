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

    const url = new URL(`${API_BASE_URL}/production/bom-definitions`);
    if (companyId) {
      url.searchParams.set("company_id", companyId);
    }

    console.log(`[BOM Definitions API] Fetching from: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorText = data?.error || `Failed to fetch BOM definitions (status ${response.status})`;
      console.error("Backend error fetching BOM definitions:", errorText);
      // Return empty array to prevent UI breaking, but log the error
      return NextResponse.json([], { status: 200 });
    }

    // Backend returns array directly
    const bomArray = Array.isArray(data) ? data : (data.data || []);
    console.log(`[BOM Definitions API] Backend returned ${bomArray.length} BOM definitions`);
    if (bomArray.length > 0) {
      console.log(`[BOM Definitions API] Sample data:`, bomArray[0]);
    } else {
      console.log(`[BOM Definitions API] No BOMs found in database`);
    }
    return NextResponse.json(bomArray, { status: response.status });
  } catch (error) {
    console.error("Error fetching BOM definitions:", error);
    // Return empty array to prevent UI breaking
    return NextResponse.json([], { status: 200 });
  }
}

