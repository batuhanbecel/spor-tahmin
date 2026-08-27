import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  serial,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/*  Better Auth çekirdek tabloları                                     */
/* ------------------------------------------------------------------ */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Ek alan: sitede görünen takma ad
  nickname: text("nickname"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable(
  "account",
  {
  id: text("id").primaryKey(),
  issuer: text("issuer").notNull(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("account_issuer_account_id_uq").on(t.issuer, t.accountId),
    index("account_user_id_idx").on(t.userId),
  ],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  Şampiyonlar Ligi verisi                                            */
/* ------------------------------------------------------------------ */

/** football-data.org takım id'si birincil anahtar olarak kullanılır. */
export const teams = pgTable("teams", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name"),
  tla: text("tla"),
  crest: text("crest"),
  country: text("country"),
  /** Kura çekiminden gelen torba (1-4). Bilinmiyorsa null. */
  pot: integer("pot"),
});

export type MatchStage =
  | "LEAGUE_STAGE"
  | "PLAYOFFS"
  | "LAST_16"
  | "QUARTER_FINALS"
  | "SEMI_FINALS"
  | "FINAL";

export const matches = pgTable(
  "matches",
  {
    id: integer("id").primaryKey(),
    stage: text("stage").notNull(),
    matchday: integer("matchday"),
    utcDate: timestamp("utc_date", { withTimezone: true }).notNull(),
    /** SCHEDULED | TIMED | IN_PLAY | PAUSED | FINISHED | POSTPONED | SUSPENDED | CANCELLED */
    status: text("status").notNull().default("SCHEDULED"),
    homeTeamId: integer("home_team_id").references(() => teams.id),
    awayTeamId: integer("away_team_id").references(() => teams.id),
    /** Takım henüz belli değilse gösterilecek metin (ör. "1A / 2B kazananı") */
    homeTeamPlaceholder: text("home_team_placeholder"),
    awayTeamPlaceholder: text("away_team_placeholder"),
    homeGoals: integer("home_goals"),
    awayGoals: integer("away_goals"),
    /** HOME_TEAM | AWAY_TEAM | DRAW | null */
    winner: text("winner"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("matches_matchday_idx").on(t.matchday), index("matches_date_idx").on(t.utcDate)],
);

/* ------------------------------------------------------------------ */
/*  Tahminler                                                          */
/* ------------------------------------------------------------------ */

export const matchPredictions = pgTable(
  "match_predictions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    homeGoals: integer("home_goals").notNull(),
    awayGoals: integer("away_goals").notNull(),
    /** Puanlanmadıysa null */
    points: integer("points"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("match_predictions_user_match_uq").on(t.userId, t.matchId),
    index("match_predictions_user_idx").on(t.userId),
  ],
);

/** Lig aşaması (36 takım) sıralama tahmini — kullanıcı başına tek satır. */
export const standingsPredictions = pgTable("standings_predictions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** 1. sıradan 36. sıraya takım id dizisi */
  order: jsonb("order").$type<number[]>().notNull(),
  points: integer("points"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BracketPicks = {
  /** Play-off turunu geçip son 16'ya kalacak 8 takım */
  R16?: number[];
  /** Çeyrek finale kalacak 8 takım */
  QF?: number[];
  /** Yarı finale kalacak 4 takım */
  SF?: number[];
  /** Finale kalacak 2 takım */
  F?: number[];
  /** Şampiyon */
  WINNER?: number;
};

export const bracketPredictions = pgTable("bracket_predictions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  picks: jsonb("picks").$type<BracketPicks>().notNull(),
  points: integer("points"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/*  Anahtar/değer ayarlar (son senkron zamanı vb.)                     */
/* ------------------------------------------------------------------ */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Team = typeof teams.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type MatchPrediction = typeof matchPredictions.$inferSelect;
export type User = typeof user.$inferSelect;
