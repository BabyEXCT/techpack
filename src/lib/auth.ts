import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {}
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        return {
          id: "demo-user",
          email: String(credentials.email)
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  }
});

