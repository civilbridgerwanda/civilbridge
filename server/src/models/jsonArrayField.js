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
// Same idea for a JSON *object* stored in a LONGTEXT column: parses on read
// and stringifies on write, so callers just deal with plain objects (`null`
// when nothing is stored or the stored text isn't valid JSON).
export function jsonObjectField(attr) {
  return {
    type: DataTypes.TEXT("long"),
    get() {
      const raw = this.getDataValue(attr);
      if (raw && typeof raw === "object") return raw;
      if (typeof raw === "string" && raw) {
        try {
          const parsed = JSON.parse(raw);
          return parsed && typeof parsed === "object" ? parsed : null;
        } catch {
          return null;
        }
      }
      return null;
    },
    set(value) {
      this.setDataValue(attr, value == null ? null : JSON.stringify(value));
    },
  };
}

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
