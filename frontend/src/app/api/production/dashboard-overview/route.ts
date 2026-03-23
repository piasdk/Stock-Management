"use server";

import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");

    const response = await fetch(`${API_BASE_URL}/production/dashboard-overview`, {
      headers: {
        ...(authHeader ? { authorization: authHeader } : {}),
      },
      next: { revalidate: 0 },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("Backend returned non-OK status:", response.status, data);
      // Return default values instead of error to prevent frontend crashes
      return NextResponse.json({
        activeOrders: 0,
        completedToday: 0,
        pendingOrders: 0,
        todayProduction: 0,
        targetProduction: 0,
        efficiencyRate: 0,
        defectRate: 0,
        rawMaterialsLow: 0,
        equipmentIssues: 0,
        workersOnShift: 0
      });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Production dashboard overview fetch error:", error);
    // Return default values instead of error to prevent frontend crashes
    return NextResponse.json({
      activeOrders: 0,
      completedToday: 0,
      pendingOrders: 0,
      todayProduction: 0,
      targetProduction: 0,
      efficiencyRate: 0,
      defectRate: 0,
      rawMaterialsLow: 0,
      equipmentIssues: 0,
      workersOnShift: 0
    });
  }
}

