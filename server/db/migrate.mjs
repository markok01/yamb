import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function buildPool() {
  if (process.env.MYSQL_HOST && process.env.MYSQL_USER && process.env.MYSQL_DATABASE) {
    return mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD ?? "",
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true,
      ...(process.env.MYSQL_SSL === "true"
        ? { ssl: { rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== "false" } }
        : {}),
    });
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Postavi MYSQL_* ili DATABASE_URL u .env.local");
  }

  return mysql.createPool({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
  });
}

function splitStatements(sql) {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith("--") && !/^USE\s+/i.test(s));
}

async function main() {
  const dir = path.join(process.cwd(), "server/db/migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pool = buildPool();

  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      console.log(`→ ${file}`);
      for (const stmt of splitStatements(sql)) {
        try {
          await pool.query(stmt);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message.includes("Duplicate column") || message.includes("already exists")) {
            console.log(`  skip (već primenjeno): ${message.slice(0, 80)}`);
            continue;
          }
          throw error;
        }
      }
    }
    console.log("Migracije završene.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
