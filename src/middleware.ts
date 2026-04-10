import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ANONYMOUS_COOKIE } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const res = NextResponse.next();
  if (!request.cookies.get(ANONYMOUS_COOKIE)?.value) {
    const id = crypto.randomUUID();
    res.cookies.set(ANONYMOUS_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return res;
}

/**
 * Only run on real app routes — never on `/_next/*`, `/api/*`, static files, or favicon.
 * Running middleware on dev internals (e.g. webpack-hmr) breaks HMR and causes 404s on CSS/JS chunks.
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
 */
export const config = {
  matcher: [
    "/((?!api|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
