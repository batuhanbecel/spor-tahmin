import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

type DB = NeonHttpDatabase<typeof schema>;

let instance: DB | null = null;

/**
 * Build aşamasında (sayfa toplama) DATABASE_URL tanımsız olabilir.
 * O durumda bağlantı nesnesi kurulur ama ilk sorguda hata verir.
 */
const BUILD_TIME_PLACEHOLDER =
  "postgresql://user:pass@localhost:5432/placeholder?sslmode=require";

/** Neon dışı (yerel Docker Postgres gibi) bağlantılarda node-postgres kullanılır. */
function isNeon(url: string) {
  return /neon\.tech|neon\.build|\.neon\./.test(url);
}

function create(): DB {
  const connectionString = process.env.DATABASE_URL || BUILD_TIME_PLACEHOLDER;

  if (!process.env.DATABASE_URL && process.env.NODE_ENV === "development") {
    console.warn(
      "[db] DATABASE_URL tanımlı değil — .env.local dosyanıza bağlantı adresini ekleyin.",
    );
  }

  if (!isNeon(connectionString) && process.env.DATABASE_URL) {
    // Yerel geliştirme: standart Postgres sürücüsü
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle: drizzleNode } = require("drizzle-orm/node-postgres");
    return drizzleNode(connectionString, { schema }) as unknown as DB;
  }

  return drizzleNeon(neon(connectionString), { schema });
}

export const db = new Proxy({} as DB, {
  get(_target, prop, receiver) {
    instance ??= create();
    const value = Reflect.get(instance as object, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
