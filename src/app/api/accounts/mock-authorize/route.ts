/**
 * Mock OAuth Authorize - Dev-only endpoint that simulates OAuth provider login.
 *
 * Immediately redirects to the callback URL with a mock authorization code.
 * Only works in development mode.
 */

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { data: null, error: { message: "Not available", code: "NOT_FOUND" } },
      { status: 404 }
    );
  }

  const url = new URL(req.url);
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");

  if (!redirectUri || !state) {
    return NextResponse.json(
      {
        data: null,
        error: {
          message: "Missing redirect_uri or state",
          code: "VALIDATION_ERROR",
        },
      },
      { status: 400 }
    );
  }

  const callbackUrl = `${redirectUri}?code=mock_code_${Date.now()}&state=${state}`;
  return NextResponse.redirect(callbackUrl);
}
