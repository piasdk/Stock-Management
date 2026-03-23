"use server";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check Authorization header first (case-insensitive)
    const authHeaderFromRequest = request.headers.get("authorization") || 
                                  request.headers.get("Authorization");
    let authToken: string | null = null;
    
    if (authHeaderFromRequest) {
      authToken = authHeaderFromRequest.startsWith("Bearer ") 
        ? authHeaderFromRequest.substring(7) 
        : authHeaderFromRequest;
    }
    
    // Fallback to cookie if no header
    if (!authToken) {
      try {
        const cookieStore = await cookies();
        authToken = cookieStore.get("auth_token")?.value || null;
      } catch (cookieError) {
        console.warn("Could not read cookie:", cookieError);
      }
    }
    
    const authHeader = authToken ? `Bearer ${authToken}` : null;

    const response = await fetch(`${API_BASE_URL}/accounting/bills/${params.id}`, {
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to fetch bill (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Bill fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching bill" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check Authorization header first (case-insensitive)
    const authHeaderFromRequest = request.headers.get("authorization") || 
                                  request.headers.get("Authorization");
    let authToken: string | null = null;
    
    if (authHeaderFromRequest) {
      authToken = authHeaderFromRequest.startsWith("Bearer ") 
        ? authHeaderFromRequest.substring(7) 
        : authHeaderFromRequest;
    }
    
    // Fallback to cookie if no header
    if (!authToken) {
      try {
        const cookieStore = await cookies();
        authToken = cookieStore.get("auth_token")?.value || null;
      } catch (cookieError) {
        console.warn("Could not read cookie:", cookieError);
      }
    }
    
    const authHeader = authToken ? `Bearer ${authToken}` : null;

    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/accounting/bills/${params.id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { authorization: authHeader } : {}),
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
            `Failed to update bill (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Bill update error:", error);
    return NextResponse.json(
      { error: "Unexpected error updating bill" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check Authorization header first (case-insensitive)
    const authHeaderFromRequest = request.headers.get("authorization") || 
                                  request.headers.get("Authorization");
    let authToken: string | null = null;
    
    if (authHeaderFromRequest) {
      authToken = authHeaderFromRequest.startsWith("Bearer ") 
        ? authHeaderFromRequest.substring(7) 
        : authHeaderFromRequest;
    }
    
    // Fallback to cookie if no header
    if (!authToken) {
      try {
        const cookieStore = await cookies();
        authToken = cookieStore.get("auth_token")?.value || null;
      } catch (cookieError) {
        console.warn("Could not read cookie:", cookieError);
      }
    }
    
    const authHeader = authToken ? `Bearer ${authToken}` : null;

    const response = await fetch(`${API_BASE_URL}/accounting/bills/${params.id}`, {
      method: "DELETE",
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to delete bill (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Bill delete error:", error);
    return NextResponse.json(
      { error: "Unexpected error deleting bill" },
      { status: 500 },
    );
  }
}

