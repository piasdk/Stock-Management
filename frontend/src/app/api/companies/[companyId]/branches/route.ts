"use server";

import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

type RouteParams = {
  params: Promise<{
    companyId: string;
  }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { companyId } = await context.params;
    const authHeader = request.headers.get("authorization");

    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/branches`,
      {
        headers: {
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        next: { revalidate: 0 },
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to fetch branches (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Branches fetch error:", error);
    return NextResponse.json(
      { error: "Unexpected error fetching branches" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { companyId } = await context.params;
    const authHeader = request.headers.get("authorization");
    const payload = await request.json();

    const response = await fetch(
      `${API_BASE_URL}/companies/${companyId}/branches`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { authorization: authHeader } : {}),
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            data?.error ||
            `Failed to create branch (status ${response.status})`,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Branch create error:", error);
    return NextResponse.json(
      { error: "Unexpected error creating branch" },
      { status: 500 },
    );
  }
}


