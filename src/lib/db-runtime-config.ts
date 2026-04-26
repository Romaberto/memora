export type DbRuntimeConfig = {
  configured: boolean;
  protocol: string | null;
  host: string | null;
  hostKind: "pooler" | "direct" | "unknown" | null;
  database: string | null;
  pooled: boolean | null;
  connectionLimit: number | null;
  sslMode: string | null;
};

export function getDbRuntimeConfig(raw = process.env.DATABASE_URL): DbRuntimeConfig {
  if (!raw) {
    return {
      configured: false,
      protocol: null,
      host: null,
      hostKind: null,
      database: null,
      pooled: null,
      connectionLimit: null,
      sslMode: null,
    };
  }

  try {
    const url = new URL(raw);
    const host = url.host || null;
    return {
      configured: true,
      protocol: url.protocol || null,
      host,
      hostKind: host?.includes("-pooler.") ? "pooler" : host ? "direct" : "unknown",
      database: url.pathname ? url.pathname.replace(/^\//, "") : null,
      pooled: url.searchParams.get("pgbouncer") === "true",
      connectionLimit: parseNullableInt(url.searchParams.get("connection_limit")),
      sslMode: url.searchParams.get("sslmode"),
    };
  } catch {
    return {
      configured: true,
      protocol: null,
      host: null,
      hostKind: "unknown",
      database: null,
      pooled: null,
      connectionLimit: null,
      sslMode: null,
    };
  }
}

function parseNullableInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}
