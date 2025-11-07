// middleware file
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

export default withAuth(
  function middleware(req) {
    const url = req.nextUrl.pathname;
    const { pathname } = req.nextUrl;
    if (url.endsWith(".php")) {
      return new NextResponse("Not Found", {status: 404});
    }

    const blockedRoutes = ["/login", "/upload"];
    if (blockedRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL("/waitlist", req.url))
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/signin",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/upload"
  ]
};
