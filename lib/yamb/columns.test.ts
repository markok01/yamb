import { describe, expect, it } from "vitest";
import {
  canFillCell,
  createEmptyColumn,
  createEmptyScorecard,
  getAvailableRows,
  isObaveznaUnlocked,
} from "./columns";
import {
  FILLABLE_ROWS_COUNT,
  OTHER_COLUMNS_COUNT,
} from "./constants";
import type { ColumnState, FillableRowKey } from "./types";

describe("columns", () => {
  describe("REDOVNA", () => {
    it("requires top-to-bottom order", () => {
      const col = createEmptyColumn("REDOVNA");
      expect(canFillCell(col, "ROW_1")).toBe(true);
      expect(canFillCell(col, "ROW_2")).toBe(false);

      col.entries.ROW_1 = { rowKey: "ROW_1", score: 2, dice: [1, 1, 2, 3, 4] };
      expect(canFillCell(col, "ROW_2")).toBe(true);
      expect(canFillCell(col, "ROW_3")).toBe(false);
      expect(canFillCell(col, "JAMB")).toBe(false);
    });
  });

  describe("OBRNUTA", () => {
    it("requires bottom-to-top order", () => {
      const col = createEmptyColumn("OBRNUTA");
      expect(canFillCell(col, "JAMB")).toBe(true);
      expect(canFillCell(col, "ROW_1")).toBe(false);

      col.entries.JAMB = { rowKey: "JAMB", score: 0, dice: [1, 2, 3, 4, 5] };
      expect(canFillCell(col, "POKER")).toBe(true);
    });
  });

  describe("PREKOREDA", () => {
    it("allows any order", () => {
      const col = createEmptyColumn("PREKOREDA");
      expect(canFillCell(col, "ROW_3")).toBe(true);
      expect(canFillCell(col, "JAMB")).toBe(true);
      expect(canFillCell(col, "MAXIMUM")).toBe(true);
    });
  });

  describe("DVOSTRUKA", () => {
    it("allows starting from Maximum or Minimum", () => {
      const col = createEmptyColumn("DVOSTRUKA");
      expect(canFillCell(col, "MAXIMUM")).toBe(true);
      expect(canFillCell(col, "MINIMUM")).toBe(true);
      expect(canFillCell(col, "ROW_1")).toBe(false);
      expect(canFillCell(col, "JAMB")).toBe(false);
    });

    it("follows Maximum→1 when starting from Maximum", () => {
      const col = createEmptyColumn("DVOSTRUKA");
      col.entries.MAXIMUM = { rowKey: "MAXIMUM", score: 20, dice: [4, 4, 4, 4, 4] };
      expect(canFillCell(col, "ROW_6")).toBe(true);
      expect(canFillCell(col, "MINIMUM")).toBe(false);

      const upper: FillableRowKey[] = ["ROW_6", "ROW_5", "ROW_4", "ROW_3", "ROW_2", "ROW_1"];
      for (const row of upper) {
        col.entries[row] = { rowKey: row, score: 1, dice: [1, 2, 3, 4, 5] };
      }
      expect(canFillCell(col, "MINIMUM")).toBe(true);
      expect(canFillCell(col, "KENTA")).toBe(false);

      col.entries.MINIMUM = { rowKey: "MINIMUM", score: 5, dice: [1, 1, 1, 1, 1] };
      expect(canFillCell(col, "KENTA")).toBe(true);
    });

    it("follows Minimum→Jamb when starting from Minimum", () => {
      const col = createEmptyColumn("DVOSTRUKA");
      col.entries.MINIMUM = { rowKey: "MINIMUM", score: 5, dice: [1, 1, 1, 1, 1] };
      expect(canFillCell(col, "KENTA")).toBe(true);
      expect(canFillCell(col, "MAXIMUM")).toBe(false);

      const lower: FillableRowKey[] = ["KENTA", "TRILING", "FUL", "POKER", "JAMB"];
      for (const row of lower) {
        col.entries[row] = { rowKey: row, score: 1, dice: [1, 2, 3, 4, 5] };
      }
      expect(canFillCell(col, "MAXIMUM")).toBe(true);
      expect(canFillCell(col, "ROW_6")).toBe(false);
    });
  });

  describe("UKRSTENA", () => {
    it("allows starting from 1 or Jamb", () => {
      const col = createEmptyColumn("UKRSTENA");
      expect(canFillCell(col, "ROW_1")).toBe(true);
      expect(canFillCell(col, "JAMB")).toBe(true);
      expect(canFillCell(col, "MAXIMUM")).toBe(false);
      expect(canFillCell(col, "POKER")).toBe(false);
    });

    it("follows 1→Maximum when starting from 1", () => {
      const col = createEmptyColumn("UKRSTENA");
      const upper: FillableRowKey[] = ["ROW_1", "ROW_2", "ROW_3", "ROW_4", "ROW_5", "ROW_6"];
      for (const row of upper) {
        col.entries[row] = { rowKey: row, score: 1, dice: [1, 2, 3, 4, 5] };
      }
      expect(canFillCell(col, "MAXIMUM")).toBe(true);
      expect(canFillCell(col, "JAMB")).toBe(false);

      col.entries.MAXIMUM = { rowKey: "MAXIMUM", score: 15, dice: [3, 3, 3, 3, 3] };
      expect(canFillCell(col, "JAMB")).toBe(true);
    });

    it("follows Jamb→Minimum when starting from Jamb", () => {
      const col = createEmptyColumn("UKRSTENA");
      col.entries.JAMB = { rowKey: "JAMB", score: 50, dice: [5, 5, 5, 5, 5] };
      expect(canFillCell(col, "POKER")).toBe(true);
      expect(canFillCell(col, "ROW_1")).toBe(false);

      const lower: FillableRowKey[] = ["POKER", "FUL", "TRILING", "KENTA", "MINIMUM"];
      for (const row of lower) {
        col.entries[row] = { rowKey: row, score: 1, dice: [1, 2, 3, 4, 5] };
      }
      expect(canFillCell(col, "ROW_1")).toBe(true);
      expect(canFillCell(col, "ROW_2")).toBe(false);
    });
  });

  describe("OBAVEZNA unlock", () => {
    it("requires 70% of other columns filled", () => {
      const columns = createEmptyScorecard();
      expect(isObaveznaUnlocked(columns)).toBe(false);

      const totalRequired = Math.ceil(
        OTHER_COLUMNS_COUNT * FILLABLE_ROWS_COUNT * 0.7
      );

      // Fill 9 non-OBAVEZNA columns partially
      for (const col of columns) {
        if (col.columnType === "OBAVEZNA") continue;
        const rowsToFill = Math.ceil(totalRequired / OTHER_COLUMNS_COUNT);
        const rowKeys: FillableRowKey[] = [
          "ROW_1", "ROW_2", "ROW_3", "ROW_4", "ROW_5", "ROW_6",
          "MAXIMUM", "MINIMUM", "KENTA", "TRILING", "FUL", "POKER", "JAMB",
        ];
        for (let i = 0; i < rowsToFill; i++) {
          col.entries[rowKeys[i]] = {
            rowKey: rowKeys[i],
            score: 1,
            dice: [1, 2, 3, 4, 5],
          };
        }
      }

      expect(isObaveznaUnlocked(columns)).toBe(true);
    });
  });

  describe("getAvailableRows", () => {
    it("returns only valid next rows for REDOVNA", () => {
      const col = createEmptyColumn("REDOVNA");
      expect(getAvailableRows(col)).toEqual(["ROW_1"]);
    });
  });
});
