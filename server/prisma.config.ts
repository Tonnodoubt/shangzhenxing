import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function normalizeDatabaseUrl(value: string) {
  return String(value || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .replace(/^[\s"'`“”‘’]+|[\s"'`“”‘’]+$/g, "");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: normalizeDatabaseUrl(env("DATABASE_URL"))
  }
});
