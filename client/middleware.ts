import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server";


export default withAuth(
  function middleware(req) {
    const url = req.nextUrl.pathname;
    if (url.endsWith(".php")) {
      return new NextResponse("Not Found", {status: 404});
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
  ]
};
