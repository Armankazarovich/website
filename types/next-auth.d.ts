import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      staffStatus: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: string;
    staffStatus: string | null;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    staffStatus: string | null;
    rememberMe?: boolean;
  }
}
