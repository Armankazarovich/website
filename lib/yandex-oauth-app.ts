import "server-only";

export const YANDEX_GROWTH_OAUTH_SCOPES = [
  "metrika:read",
  "metrika:write",
  "direct:api",
] as const;

export type YandexUnifiedOAuthApp = {
  clientId: string;
  clientSecret: string;
  mode: "unified" | "shared-service-app";
};

export function getYandexUnifiedOAuthApp(): YandexUnifiedOAuthApp | null {
  const unifiedClientId =
    process.env.YANDEX_OAUTH_CLIENT_ID || process.env.YANDEX_LOGIN_CLIENT_ID || "";
  const unifiedClientSecret =
    process.env.YANDEX_OAUTH_CLIENT_SECRET ||
    process.env.YANDEX_LOGIN_CLIENT_SECRET ||
    "";
  if (unifiedClientId && unifiedClientSecret) {
    return {
      clientId: unifiedClientId,
      clientSecret: unifiedClientSecret,
      mode: "unified",
    };
  }

  const directClientId = process.env.YANDEX_DIRECT_CLIENT_ID || "";
  const metrikaClientId = process.env.YANDEX_METRIKA_CLIENT_ID || "";
  if (
    directClientId &&
    metrikaClientId &&
    directClientId === metrikaClientId &&
    process.env.YANDEX_DIRECT_CLIENT_SECRET
  ) {
    return {
      clientId: directClientId,
      clientSecret:
        process.env.YANDEX_DIRECT_CLIENT_SECRET ||
        process.env.YANDEX_METRIKA_CLIENT_SECRET ||
        "",
      mode: "shared-service-app",
    };
  }

  return null;
}

export function yandexUnifiedOAuthRedirectUri(req: Request) {
  const requestUrl = new URL(req.url);
  return (
    process.env.YANDEX_OAUTH_REDIRECT_URI ||
    `${requestUrl.protocol}//${requestUrl.host}/api/admin/aray/connectors/yandex/oauth/callback`
  );
}
