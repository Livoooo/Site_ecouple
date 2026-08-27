import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (await isValidSessionToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  if (request.nextUrl.pathname !== "/") {
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};
