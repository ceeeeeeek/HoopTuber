// client/app/api/auth/[...nextauth]/route.ts
// -----------------------------------------------------------------------------
// UNCHANGED (structure): load config from ./auth-options and hand to NextAuth.
// -----------------------------------------------------------------------------
import NextAuth from "next-auth";
import { authOptions } from "./auth-options";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
