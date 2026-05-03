import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Hook central para auth futura em `/admin`.
 * Hoje apenas repassa — sem sessão nem redirect.
 */
export function middleware(request: NextRequest) {
  void request;
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
