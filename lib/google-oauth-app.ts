import "server-only";

export const GOOGLE_GROWTH_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/adwords",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters",
  "https://www.googleapis.com/auth/business.manage",
] as const;

export type GoogleUnifiedOAuthApp = {
  clientId: string;
  clientSecret: string;
};

export function getGoogleUnifiedOAuthApp(): GoogleUnifiedOAuthApp | null {
  const clientId =
    process.env.GOOGLE_OAUTH_CLIENT_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    process.env.GOOGLE_ADS_CLIENT_ID ||
    "";
  const clientSecret =
    process.env.GOOGLE_OAUTH_CLIENT_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    process.env.GOOGLE_ADS_CLIENT_SECRET ||
    "";

  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function googleUnifiedOAuthRedirectUri(req: Request) {
  const requestUrl = new URL(req.url);
  return (
    process.env.GOOGLE_OAUTH_REDIRECT_URI ||
    `${requestUrl.protocol}//${requestUrl.host}/api/admin/aray/connectors/google/oauth/callback`
  );
}
