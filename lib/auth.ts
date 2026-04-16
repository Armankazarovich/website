import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { normalizePhone } from "@/lib/phone";

const loginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(6),
  rememberMe: z.string().optional(),
});

// Определяем — телефон или email
function isPhone(input: string): boolean {
  return /^[\d\s\-\+\(\)]{7,}$/.test(input.trim()) && !input.includes("@");
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
          const phoneVariants: { phone: string }[] = [
            { phone: login.trim() },
            { phone: login.replace(/\D/g, "") },
          ];
          if (normalized) phoneVariants.unshift({ phone: normalized });
          user = await prisma.user.findFirst({
            where: { OR: phoneVariants },
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
        if (user.role !== "USER" && user.role !== "SUPER_ADMIN" && user.staffStatus && user.staffStatus !== "ACTIVE") {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          staffStatus: user.staffStatus ?? null,
          rememberMe: rememberMe === "true",
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = user.role;
        token.staffStatus = user.staffStatus ?? null;
        token.rememberMe = user.rememberMe ?? false;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.staffStatus = token.staffStatus ?? null;
      }
      return session;
    },
  },
});
