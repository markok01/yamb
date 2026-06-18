import fs from "fs";
import { drizzle } from "drizzle-orm/mysql2";
import mysql, { type PoolOptions, type SslOptions } from "mysql2/promise";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  pool: mysql.Pool | undefined;
};

function env(key: string): string | undefined {
  return process.env[`MYSQL_${key}`];
}

function envBool(key: string): boolean {
  const v = env(key);
  return v === "true" || v === "1";
}

function resolveSsl(host?: string): SslOptions | undefined {
  const sslCaRaw = process.env.MYSQL_SSL_CA?.trim();
  const needsSsl =
    Boolean(sslCaRaw) || envBool("SSL") || host?.includes("aivencloud.com");

  if (!needsSsl) return undefined;

  let ca: string | undefined;
  if (sslCaRaw?.includes("-----BEGIN CERTIFICATE-----")) {
    ca = sslCaRaw;
  } else if (sslCaRaw && fs.existsSync(sslCaRaw)) {
    ca = fs.readFileSync(sslCaRaw, "utf8");
  }

  if (!ca) return undefined;

  return {
    ca,
    rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

function buildPoolFromEnv(): PoolOptions {
  const host = env("HOST");
  const user = env("USER");
  const database = env("DATABASE");
  const password = env("PASSWORD") ?? "";

  if (!host || !user || !database) {
    throw new Error(
      "Postavi MYSQL_HOST, MYSQL_USER, MYSQL_DATABASE (i MYSQL_PASSWORD) u .env.local"
    );
  }

  if (!password && host.includes("aivencloud.com")) {
    throw new Error("MYSQL_PASSWORD je prazan — nalepi Aiven lozinku u .env.local");
  }

  const port = env("PORT") ? Number(env("PORT")) : 3306;
  const needsSsl = envBool("SSL") || host.includes("aivencloud.com");

  return {
    host,
    port,
    user,
    password,
    database,
    timezone: "Z",
    waitForConnections: true,
    connectionLimit: 10,
    ...(needsSsl ? { ssl: resolveSsl(host) } : {}),
  };
}

function buildPoolFromUrl(): PoolOptions {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ili MYSQL_* promenljive nisu postavljene");
  }

  const sslCaPath = process.env.MYSQL_SSL_CA?.trim();
  const parsed = new URL(url);

  const options: PoolOptions = {
    host: parsed.hostname,
    port: Number(parsed.port) || 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    timezone: "Z",
    waitForConnections: true,
    connectionLimit: 10,
  };

  if (sslCaPath) {
    const ssl = resolveSsl(parsed.hostname);
    if (ssl) options.ssl = ssl;
  }

  return options;
}

function createPool() {
  if (env("HOST") && env("USER") && env("DATABASE")) {
    return mysql.createPool(buildPoolFromEnv());
  }
  return mysql.createPool(buildPoolFromUrl());
}

export function getPool() {
  if (!globalForDb.pool) {
    globalForDb.pool = createPool();
  }
  return globalForDb.pool;
}

export function getMysqlDb() {
  return drizzle(getPool(), { schema, mode: "default" });
}

export { schema };
