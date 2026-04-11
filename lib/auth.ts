import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(6),
  rememberMe: z.string().optional(),
});

// Определяем — телефон или email
function isPhone(input: string): boolean {
  return /^[\d\s\-\+\(\)]{7,}$/.test(input.trim()) && !input.includes("@");
}

// Нормализуем телефон → +7XXXXXXXXXX
function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "7" || digits[0] === "8")) {
    return "+7" + digits.slice(1);
  }
  if (digits.length === 10) {
    return "+7" + digits;
  }
  return "+" + digits;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 дней максимум
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { login, password, rememberMe } = parsed.data;

        // Ищем пользователя по телефону ИЛИ email
        let user;
        if (isPhone(login)) {
          const normalized = normalizePhone(login);
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: normalized },
                { phone: login.trim() },
                { phone: login.replace(/\D/g, "") },
              ],
            },
          });
        } else {
          user = await prisma.user.findUnique({
            where: { email: login.toLowerCase().trim() },
          });
        }

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        // Block pending/suspended staff from logging in (SUPER_ADMIN always allowed)
        if (user.role !== "USER" && user.role !== "SUPER_ADMIN" && (user as any).staffStatus && (user as any).staffStatus !== "ACTIVE") {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          staffStatus: (user as any).staffStatus ?? null,
          rememberMe: rememberMe === "true",
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.staffStatus = (user as any).staffStatus ?? null;
        token.rememberMe = (user as any).rememberMe ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
        (session.user as any).staffStatus = token.staffStatus ?? null;
      }
      return session;
    },
  },
});
