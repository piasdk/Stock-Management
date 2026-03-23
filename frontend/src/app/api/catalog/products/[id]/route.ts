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
    
    console.log(`[Products API] GET request for product ID: ${id}`);
    
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

    const response = await fetch(`${API_BASE_URL}/catalog/products/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[Products API] GET failed: ${response.status}`, data);
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to fetch product (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    console.log(`[Products API] GET success for product ID: ${id}`);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Products API] GET error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching product" },
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
    
    console.log(`[Products API] PUT request for product ID: ${id}`);
    
    const payload = await request.json();
    
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

    const response = await fetch(`${API_BASE_URL}/catalog/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
      },
      body: JSON.stringify(payload),
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[Products API] PUT failed: ${response.status}`, data);
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to update product (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    console.log(`[Products API] PUT success for product ID: ${id}`);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Products API] PUT error:", error);
    return NextResponse.json(
      { error: "Unexpected error updating product" },
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
    const id = resolvedParams.id;
    
    console.log(`[Products API] DELETE request for product ID: ${id}`);
    
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

    const response = await fetch(`${API_BASE_URL}/catalog/products/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        authorization: authHeader,
      },
      next: { revalidate: 0 },
    });

    // Handle 204 No Content response (successful deletion with no body)
    if (response.status === 204) {
      console.log(`[Products API] DELETE success for product ID: ${id}`);
      return new NextResponse(null, { status: 204 });
    }

    // For other responses, try to parse JSON
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(`[Products API] DELETE failed: ${response.status}`, data);
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to delete product (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    console.log(`[Products API] DELETE success for product ID: ${id}`);
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[Products API] DELETE error:", error);
    return NextResponse.json(
      { error: "Unexpected error deleting product" },
      { status: 500 },
    );
  }
}
