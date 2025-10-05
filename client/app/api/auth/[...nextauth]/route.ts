import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials"

async function verifyUser(email?: string, password?: string) {
  // Temporary hardcoded example for testing, replace with real user verification logic when actual DB is implemented:
  if (email === "test@example.com" && password === "123456") {
    return { id: "1", name: "Test User", email }
  }

  // If user not found or password incorrect:
  return null
}

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
        name: "Sign in",
        credentials: {
            email: {
                label: "Email",
                type: "email",
                placeholder: "",
            },
        password: { label: "Paddword", type: "password" },
        },
              async authorize(credentials) {
        // Verifying user with example
        const user = await verifyUser(credentials?.email, credentials?.password)
        if (!user) {
          throw new Error("Invalid email or password")
        }
        return user
      },
    }),
  ],
  callbacks: {
    // callback to monitor every time user logs in
    async signIn({ user, account, profile, email, credentials }) {
      console.log("New login attempt from:", user)
      return true
    },
    // callback to monitor session activity
    async session({ session, token}) {
      console.log("Session callback for: ", session.user?.email)
      return session
    },
    // mointoring JWT token 
    async jwt({ token, user }) {
      if (user) {
        console.log("JWT issued for: ", user.email)
      }
      return token
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login", // optional custom login page
  },
})

export { handler as GET, handler as POST }