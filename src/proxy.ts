import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isAuthed } from "@/lib/server/auth";

// Every page and API call needs the shop password, except the login page itself.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || pathname === "/api/login") return NextResponse.next();
  if (isAuthed(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL("/login", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // skip static files, fonts, icons and the logo so the login page can still load them
  matcher: ["/((?!_next/static|_next/image|fonts/|favicon.ico|icon.png|apple-icon.png|icon-192.png|icon-512.png|logo.png|manifest.webmanifest).*)"],
};
