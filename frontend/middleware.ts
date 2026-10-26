import { NextResponse, type NextRequest } from "next/server";

/** Forwards the request path so server layouts can build a `?next=` redirect. */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/kitchen/:path*",
    "/recipes/:path*",
    "/favourites/:path*",
    "/planner/:path*",
    "/shopping/:path*",
    "/profile/:path*",
  ],
};
