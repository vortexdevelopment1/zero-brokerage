import type { Migration } from "../src/index.js";

export const migration: Migration = {
  id: "20260925_001_enable_postgis",

  async up(client) {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS postgis;
    `);
  },
};
