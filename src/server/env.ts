import "server-only";

/**
 * Server environment.
 *
 * Deliberately *not* validated with a top-level `z.object().parse()` at import
 * time: this module is pulled in by `next build`, which renders pages in a
 * process that has no production secrets. Hard-failing there would make the
 * build require the very credentials it is supposed to be independent of.
 *
 * Instead each secret is read through an accessor that throws only when the
 * feature is actually used, and `describeEnvironment()` reports what is
 * configured so the admin panel and the launch checklist can show it.
 */

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * A positive integer from the environment, or the default.
 *
 * Anything unparseable or non-positive falls back rather than throwing: a
 * typo in a throttle ceiling must not take the whole site down, and the
 * default is the safe value.
 */
function positiveInt(name: string, fallback: number): number {
  const raw = optional(name);
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function required(name: string, feature: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(
      `${name} is not set. It is required for ${feature}. ` +
        `Add it to .env.local (see .env.example).`,
    );
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return optional("DATABASE_URL");
  },

  /** Absolute origin, used for links in emails. */
  get appUrl() {
    return (
      optional("APP_URL") ??
      (optional("VERCEL_PROJECT_PRODUCTION_URL")
        ? `https://${optional("VERCEL_PROJECT_PRODUCTION_URL")}`
        : undefined) ??
      "http://localhost:3000"
    );
  },

  get isProduction() {
    return process.env.NODE_ENV === "production";
  },

  get isTest() {
    return process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  },

  /** Secret used to sign the session cookie's integrity tag. */
  sessionSecret(): string {
    const value = optional("SESSION_SECRET");
    if (value) return value;
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET is not set. Generate one with `openssl rand -base64 32`.",
      );
    }
    // Development/test only — stable so sessions survive a dev-server restart.
    return "dev-only-insecure-session-secret-do-not-use-in-production";
  },

  email: {
    /** "resend" | "console". Console just logs — the default in development. */
    get provider() {
      return optional("EMAIL_PROVIDER") ?? (optional("RESEND_API_KEY") ? "resend" : "console");
    },
    resendApiKey: () => required("RESEND_API_KEY", "sending email via Resend"),
    get from() {
      return optional("EMAIL_FROM") ?? "Ammoun Sweets <onboarding@resend.dev>";
    },
  },

  /**
   * Per-IP throttle ceilings.
   *
   * Configurable because the right number depends on the deployment, not on
   * the code: a shop behind carrier-grade NAT shares one IP across a suburb,
   * and the end-to-end suite deliberately places many orders from one address.
   * The defaults are the production values — an override has to be explicit.
   *
   * These are ceilings only. Removing the throttle entirely is not offered,
   * because "0 means unlimited" is the kind of configuration mistake that only
   * shows up as an incident.
   */
  limits: {
    get checkoutPerIp() {
      return positiveInt("RATE_LIMIT_CHECKOUT_PER_IP", 10);
    },
    get loginPerIp() {
      return positiveInt("RATE_LIMIT_LOGIN_PER_IP", 10);
    },
  },

  /** Seed-time bootstrap for the first admin. Never a hardcoded default. */
  seed: {
    get adminEmail() {
      return optional("SEED_ADMIN_EMAIL");
    },
    get adminPassword() {
      return optional("SEED_ADMIN_PASSWORD");
    },
  },
} as const;

export type EnvironmentReport = {
  database: "postgres" | "pglite";
  email: string;
  appUrl: string;
  missingForProduction: string[];
};

/**
 * What is and isn't configured. Surfaced in the admin dashboard so the owner
 * can see at a glance that, say, order emails are still only being logged.
 *
 * There is no payment gateway to report: orders are paid in the shop on
 * collection, so nothing here needs credentials for taking money.
 */
export function describeEnvironment(): EnvironmentReport {
  const url = env.databaseUrl;
  const missing: string[] = [];

  if (!url || !/^postgres(ql)?:\/\//i.test(url)) missing.push("DATABASE_URL (managed PostgreSQL)");
  if (!optional("SESSION_SECRET")) missing.push("SESSION_SECRET");
  if (env.email.provider === "console") missing.push("RESEND_API_KEY (or another email provider)");
  if (!optional("APP_URL")) missing.push("APP_URL");

  return {
    database: url && /^postgres(ql)?:\/\//i.test(url) ? "postgres" : "pglite",
    email: env.email.provider,
    appUrl: env.appUrl,
    missingForProduction: missing,
  };
}
