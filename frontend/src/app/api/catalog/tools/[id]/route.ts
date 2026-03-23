"use server";

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;

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

    const response = await fetch(`${API_BASE_URL}/catalog/tools/${id}`, {
      method: "GET",
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
            `Failed to fetch tool (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Tool fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching tool" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;

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

    const response = await fetch(`${API_BASE_URL}/catalog/tools/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
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
            `Failed to update tool (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Tool update error:", error);
    return NextResponse.json(
      { error: "Unexpected error updating tool" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Handle both Promise and direct params for compatibility
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;

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

    const response = await fetch(`${API_BASE_URL}/catalog/tools/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
      },
      next: { revalidate: 0 },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to delete tool (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Tool delete error:", error);
    return NextResponse.json(
      { error: "Unexpected error deleting tool" },
      { status: 500 },
    );
  }
}

