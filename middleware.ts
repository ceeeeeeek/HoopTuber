// // middleware.ts (Sunday 10-12-2025 Version)

export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/upload", "/dashboard/:path*"
  ],
};
