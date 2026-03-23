import { NextResponse } from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000/api";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const loginUrl = `${API_BASE_URL}/auth/login`;
    console.log("Attempting login to:", loginUrl);
    console.log("API_BASE_URL:", API_BASE_URL);

    let response: Response;
    try {
      response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      console.log("Backend response status:", response.status);
      console.log("Backend response URL:", response.url);
    } catch (fetchError) {
      // Network error - backend might not be running
      console.error("Network error connecting to backend:", fetchError);
      return NextResponse.json(
        {
          error: "Cannot connect to backend server. Please ensure the backend is running on port 5000.",
          details: fetchError instanceof Error ? fetchError.message : String(fetchError),
          attemptedUrl: loginUrl,
        },
        { status: 503 },
      );
    }

    // Try to parse JSON response
    let data: any = {};
    try {
      const text = await response.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch (parseError) {
      // If response is not JSON, create error object
      console.error("Failed to parse backend response:", parseError);
      data = { error: `Backend returned non-JSON response (status ${response.status})` };
    }

    if (!response.ok) {
      // Log the error for debugging
      console.error("Backend login error:", {
        status: response.status,
        error: data?.error,
        details: data?.details,
        sqlMessage: data?.sqlMessage,
        code: data?.code,
        responseUrl: response.url,
        attemptedUrl: loginUrl,
      });

      // Provide more helpful error message for 404
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: "Login endpoint not found. Please ensure the backend server is running and the route is configured correctly.",
            details: `Backend returned 404 for ${loginUrl}. Check that the backend server is running on port 5000.`,
            attemptedUrl: loginUrl,
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          error:
            data?.error || `Failed to log in (status ${response.status})`,
          details: data?.details,
          sqlMessage: data?.sqlMessage,
        },
        { status: response.status || 500 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Login proxy error:", error);
    return NextResponse.json(
      { 
        error: "Unexpected error during login",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
