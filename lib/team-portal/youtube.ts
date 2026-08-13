import { decryptSecret, encryptSecret } from "@/lib/team-portal/crypto";

export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.force-ssl";

export type YouTubeCredentials = {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  scope?: string;
  token_type?: string;
};

export function youtubeConfiguration() {
  const clientId = String(process.env.GOOGLE_YOUTUBE_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.GOOGLE_YOUTUBE_CLIENT_SECRET || "").trim();
  if (!clientId || !clientSecret) throw new Error("YOUTUBE_OAUTH_CONFIGURATION_MISSING");
  return { clientId, clientSecret };
}

export async function exchangeYouTubeCode(code: string, redirectUri: string) {
  const { clientId, clientSecret } = youtubeConfiguration();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok || !payload.access_token) {
    throw new Error(String(payload.error_description || payload.error || "YouTube authorization failed."));
  }
  return {
    access_token: String(payload.access_token),
    refresh_token: payload.refresh_token ? String(payload.refresh_token) : undefined,
    expires_at: Date.now() + Number(payload.expires_in || 3600) * 1000,
    scope: String(payload.scope || YOUTUBE_SCOPE),
    token_type: String(payload.token_type || "Bearer"),
  } satisfies YouTubeCredentials;
}

export async function activeYouTubeCredentials(encrypted: string) {
  const current = decryptSecret<YouTubeCredentials>(encrypted);
  if (current.expires_at > Date.now() + 60_000) return { credentials: current, encrypted };
  if (!current.refresh_token) throw new Error("YouTube access expired. Reconnect the channel.");

  const { clientId, clientSecret } = youtubeConfiguration();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: current.refresh_token,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  const payload = await response.json() as Record<string, unknown>;
  if (!response.ok || !payload.access_token) throw new Error("YouTube access could not be refreshed.");
  const credentials: YouTubeCredentials = {
    ...current,
    access_token: String(payload.access_token),
    expires_at: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };
  return { credentials, encrypted: encryptSecret(credentials) };
}

async function youtubeRequest<T>(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`https://www.googleapis.com/youtube/v3/${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || "YouTube request failed.");
  return payload;
}

export async function loadYouTubeChannel(accessToken: string) {
  const payload = await youtubeRequest<{ items?: Array<{ id: string; snippet?: { title?: string } }> }>(
    "channels?part=id%2Csnippet&mine=true",
    accessToken
  );
  const channel = payload.items?.[0];
  if (!channel) throw new Error("The connected Google account has no YouTube channel.");
  return { id: channel.id, title: channel.snippet?.title || "YouTube channel" };
}

export async function createYouTubeBroadcast(input: {
  accessToken: string;
  title: string;
  description?: string;
  scheduledStart: string;
  privacyStatus: "private" | "unlisted" | "public";
}) {
  const broadcast = await youtubeRequest<{ id: string }>(
    "liveBroadcasts?part=id%2Csnippet%2Cstatus%2CcontentDetails",
    input.accessToken,
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          title: input.title,
          description: input.description || "",
          scheduledStartTime: new Date(input.scheduledStart).toISOString(),
        },
        status: { privacyStatus: input.privacyStatus, selfDeclaredMadeForKids: false },
        contentDetails: { enableAutoStart: true, enableAutoStop: true },
      }),
    }
  );

  const stream = await youtubeRequest<{
    id: string;
    cdn?: { ingestionInfo?: { ingestionAddress?: string; streamName?: string } };
  }>("liveStreams?part=id%2Csnippet%2Ccdn%2Cstatus", input.accessToken, {
    method: "POST",
    body: JSON.stringify({
      snippet: { title: `${input.title} — FACKTS feed` },
      cdn: { frameRate: "variable", ingestionType: "rtmp", resolution: "variable" },
      contentDetails: { isReusable: false },
    }),
  });

  await youtubeRequest(
    `liveBroadcasts/bind?id=${encodeURIComponent(broadcast.id)}&part=id%2CcontentDetails&streamId=${encodeURIComponent(stream.id)}`,
    input.accessToken,
    { method: "POST", body: "{}" }
  );

  return {
    broadcastId: broadcast.id,
    streamId: stream.id,
    watchUrl: `https://www.youtube.com/watch?v=${broadcast.id}`,
    ingestionAddress: stream.cdn?.ingestionInfo?.ingestionAddress || "",
    streamName: stream.cdn?.ingestionInfo?.streamName || "",
  };
}
