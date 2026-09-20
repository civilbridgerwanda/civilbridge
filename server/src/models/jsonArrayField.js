import { DataTypes } from "sequelize";

// This DB is MariaDB (confirmed via `SHOW COLUMNS`, which reports these
// columns as `longtext`, not `json`) - MariaDB's JSON type is just an alias
// for LONGTEXT, so Sequelize's dialect-detection never recognizes the
// column as JSON and skips its usual auto-parse-on-read. Without this, a
// value written as a real array comes back from a fresh SELECT as the raw
// JSON *text* (a string), which crashes anything expecting `.map()` to
// work on it. This explicit getter makes the field behave as a JS array on
// read, independent of that dialect quirk. `attr` is the field's own name
// (Sequelize getters aren't told this automatically).
export function jsonArrayField(attr) {
  return {
    type: DataTypes.JSON,
    get() {
      const raw = this.getDataValue(attr);
      if (Array.isArray(raw)) return raw;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    },
  };
}
