import "server-only";

import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/tenant-context";

type ResolveTelegramCredentialsOptions = {
  tenantId?: string | null;
  requireChatId?: boolean;
};

export type TelegramCredentials =
  | {
      ok: true;
      token: string;
      chatId: string | null;
      source: "env" | "site-settings" | "mixed";
      missing: [];
    }
  | {
      ok: false;
      token: string | null;
      chatId: string | null;
      source: "none" | "env" | "site-settings" | "mixed";
      missing: string[];
      error: string;
    };

function cleanSecret(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveSource(hasEnvToken: boolean, hasEnvChatId: boolean, hasDbToken: boolean, hasDbChatId: boolean) {
  if ((hasEnvToken || hasEnvChatId) && (hasDbToken || hasDbChatId)) return "mixed" as const;
  if (hasEnvToken || hasEnvChatId) return "env" as const;
  if (hasDbToken || hasDbChatId) return "site-settings" as const;
  return "none" as const;
}

export async function resolveTelegramCredentials(
  options: ResolveTelegramCredentialsOptions = {},
): Promise<TelegramCredentials> {
  const tenantId = options.tenantId || DEFAULT_TENANT_ID;
  const requireChatId = options.requireChatId !== false;
  const envToken = cleanSecret(process.env.TELEGRAM_BOT_TOKEN);
  const envChatId = cleanSecret(process.env.TELEGRAM_CHAT_ID);

  let dbToken: string | null = null;
  let dbChatId: string | null = null;

  if (!envToken || (requireChatId && !envChatId)) {
    const rows = await prisma.siteSettings.findMany({
      where: {
        tenantId,
        key: { in: ["telegram_bot_token", "telegram_chat_id"] },
      },
      select: { key: true, value: true },
    });
    for (const row of rows) {
      if (row.key === "telegram_bot_token") dbToken = cleanSecret(row.value);
      if (row.key === "telegram_chat_id") dbChatId = cleanSecret(row.value);
    }
  }

  const token = envToken || dbToken;
  const chatId = envChatId || dbChatId;
  const source = resolveSource(Boolean(envToken), Boolean(envChatId), Boolean(dbToken), Boolean(dbChatId));
  const missing = [
    !token ? "telegram_bot_token" : null,
    requireChatId && !chatId ? "telegram_chat_id" : null,
  ].filter((value): value is string => Boolean(value));

  if (missing.length) {
    return {
      ok: false,
      token,
      chatId,
      source,
      missing,
      error: `Telegram не настроен: ${missing.join(", ")}`,
    };
  }

  return {
    ok: true,
    token: token!,
    chatId,
    source: source === "none" ? "env" : source,
    missing: [],
  };
}

export function maskTelegramChatId(chatId: string | null) {
  if (!chatId) return null;
  if (chatId.length <= 6) return "***";
  return `${chatId.slice(0, 3)}...${chatId.slice(-3)}`;
}
