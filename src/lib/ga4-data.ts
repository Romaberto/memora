import { SignJWT, importPKCS8 } from "jose";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";
const GOOGLE_ANALYTICS_AUDIENCE = GOOGLE_TOKEN_URL;

type DaySeriesPoint = {
  date: string;
  count: number;
};

type Ga4VisitorsResult =
  | {
      ok: true;
      trackingEnabled: boolean;
      propertyId: string;
      total: number;
      series: DaySeriesPoint[];
    }
  | {
      ok: false;
      trackingEnabled: boolean;
      reason: string;
      series: DaySeriesPoint[];
      total: null;
    };

type ServiceAccountCredentials = {
  clientEmail: string;
  privateKey: string;
};

function parseServiceAccountFromEnv(): ServiceAccountCredentials | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const parsed = JSON.parse(json) as {
        client_email?: string;
        private_key?: string;
      };
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch {
      return null;
    }
  }

  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!clientEmail || !privateKey) {
    return null;
  }

  return { clientEmail, privateKey };
}

function parsePropertyId() {
  return (
    process.env.GA4_PROPERTY_ID ||
    process.env.GOOGLE_ANALYTICS_PROPERTY_ID ||
    null
  );
}

async function getGoogleAccessToken(credentials: ServiceAccountCredentials) {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(credentials.privateKey, "RS256");

  const assertion = await new SignJWT({
    scope: GOOGLE_ANALYTICS_SCOPE,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(credentials.clientEmail)
    .setSubject(credentials.clientEmail)
    .setAudience(GOOGLE_ANALYTICS_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("token response missing access_token");
  }

  return json.access_token;
}

function gaDateToYmd(gaDate: string) {
  if (!/^\d{8}$/.test(gaDate)) return gaDate;
  return `${gaDate.slice(0, 4)}-${gaDate.slice(4, 6)}-${gaDate.slice(6, 8)}`;
}

async function runReport(accessToken: string, propertyId: string, body: Record<string, unknown>) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`runReport failed (${res.status}): ${text.slice(0, 300)}`);
  }

  return (await res.json()) as {
    rows?: Array<{
      dimensionValues?: Array<{ value?: string }>;
      metricValues?: Array<{ value?: string }>;
    }>;
    totals?: Array<{
      metricValues?: Array<{ value?: string }>;
    }>;
  };
}

export async function getGa4VisitorsSeries({
  from,
  to,
}: {
  from: string;
  to: string;
}): Promise<Ga4VisitorsResult> {
  const trackingEnabled = Boolean(process.env.NEXT_PUBLIC_GA_ID);
  const credentials = parseServiceAccountFromEnv();
  const propertyId = parsePropertyId();

  if (!trackingEnabled) {
    return {
      ok: false,
      trackingEnabled: false,
      reason: "No GA4 measurement ID is configured.",
      total: null,
      series: [],
    };
  }

  if (!propertyId) {
    return {
      ok: false,
      trackingEnabled: true,
      reason: "GA4 property ID is missing. Add GA4_PROPERTY_ID in Vercel.",
      total: null,
      series: [],
    };
  }

  if (!credentials) {
    return {
      ok: false,
      trackingEnabled: true,
      reason:
        "GA4 service account credentials are missing. Add GOOGLE_SERVICE_ACCOUNT_JSON or split client email/private key envs.",
      total: null,
      series: [],
    };
  }

  try {
    const accessToken = await getGoogleAccessToken(credentials);
    const [seriesReport, totalReport] = await Promise.all([
      runReport(accessToken, propertyId, {
        dateRanges: [{ startDate: from, endDate: to }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
        keepEmptyRows: true,
      }),
      runReport(accessToken, propertyId, {
        dateRanges: [{ startDate: from, endDate: to }],
        metrics: [{ name: "activeUsers" }],
      }),
    ]);

    const series =
      seriesReport.rows?.map((row) => ({
        date: gaDateToYmd(row.dimensionValues?.[0]?.value ?? ""),
        count: Number(row.metricValues?.[0]?.value ?? 0),
      })) ?? [];

    const total = Number(totalReport.totals?.[0]?.metricValues?.[0]?.value ?? 0);

    return {
      ok: true,
      trackingEnabled: true,
      propertyId,
      total,
      series,
    };
  } catch (error) {
    return {
      ok: false,
      trackingEnabled: true,
      reason: error instanceof Error ? error.message : "Unknown GA4 error.",
      total: null,
      series: [],
    };
  }
}
