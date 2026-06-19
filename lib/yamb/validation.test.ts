import { describe, expect, it } from "vitest";
import { MAKSIMALNA_ALLOWED_SCORES } from "./constants";
import {
  validateColumnAccess,
  validateManualScore,
  validateMaksimalnaScore,
  validateMinimumScore,
  validateNajavaBeforeRoll,
  validateNajavaDojavaTarget,
  validateNajavaSubmit,
  validateDirectedSubmit,
  validateRoll,
  validateSubmitScore,
} from "./validation";
import { createEmptyColumn, createEmptyScorecard, isObaveznaUnlocked } from "./columns";
import { createTurn } from "./engine";
import type { ColumnState, TurnState } from "./types";

describe("validation", () => {
  describe("MAKSIMALNA", () => {
    it("accepts only allowed scores", () => {
      expect(validateMaksimalnaScore("ROW_1", 5).valid).toBe(true);
      expect(validateMaksimalnaScore("ROW_1", 10).valid).toBe(false);
      expect(validateMaksimalnaScore("KENTA", 66).valid).toBe(true);
      expect(validateMaksimalnaScore("JAMB", 80).valid).toBe(true);
    });

    it("has all row keys defined", () => {
      const rows = Object.keys(MAKSIMALNA_ALLOWED_SCORES);
      expect(rows.length).toBe(13);
    });
  });

  describe("RUČNA", () => {
    it("validates manual score against dice", () => {
      const result = validateManualScore("ROW_1", [1, 1, 3, 4, 5], 2, "RUCNA");
      expect(result.valid).toBe(true);

      const wrong = validateManualScore("ROW_1", [1, 1, 3, 4, 5], 5, "RUCNA");
      expect(wrong.valid).toBe(false);

      const zero = validateManualScore("KENTA", [1, 1, 1, 1, 1], 0, "RUCNA");
      expect(zero.valid).toBe(true);
    });
  });

  describe("MINIMUM", () => {
    it("rejects scores below 5", () => {
      expect(validateMinimumScore("MINIMUM", 4).valid).toBe(false);
      expect(validateMinimumScore("MINIMUM", 5).valid).toBe(true);
      expect(validateManualScore("MINIMUM", [1, 1, 1, 1, 1], 4, "RUCNA").valid).toBe(
        false
      );
    });
  });

  describe("NAJAVA", () => {
    it("requires najava before first roll", () => {
      const col = createEmptyColumn("NAJAVA");
      expect(validateNajavaBeforeRoll(col, "KENTA", 0).valid).toBe(true);

      const turn: TurnState = { ...createTurn("NAJAVA"), rollCount: 1 };
      expect(validateNajavaBeforeRoll(col, "KENTA", turn.rollCount).valid).toBe(false);
    });

    it("requires matching DOJAVA cell when columns provided", () => {
      const columns = createEmptyScorecard();
      const najava = columns.find((c) => c.columnType === "NAJAVA")!;
      const dojava = columns.find((c) => c.columnType === "DOJAVA")!;

      expect(
        validateNajavaBeforeRoll(najava, "KENTA", 0, columns).valid
      ).toBe(true);

      dojava.entries.KENTA = {
        rowKey: "KENTA",
        score: 10,
        dice: [1, 2, 3, 4, 5],
      };
      expect(
        validateNajavaBeforeRoll(najava, "KENTA", 0, columns).valid
      ).toBe(false);
      expect(validateNajavaDojavaTarget(columns, "KENTA").errorCode).toBe(
        "NAJAVA_DIRECT_UNAVAILABLE"
      );
    });

    it("requires submit to announced field", () => {
      const turn: TurnState = {
        ...createTurn("NAJAVA"),
        rollCount: 1,
        dice: [1, 2, 3, 4, 5],
        najavaRowKey: "KENTA",
      };
      expect(validateNajavaSubmit(turn, "KENTA").valid).toBe(true);
      expect(validateNajavaSubmit(turn, "TRILING").valid).toBe(false);
    });
  });

  describe("OBAVEZNA", () => {
    it("blocks access when locked", () => {
      const columns = createEmptyScorecard();
      const obavezna = columns.find((c) => c.columnType === "OBAVEZNA")!;
      expect(isObaveznaUnlocked(columns)).toBe(false);

      const result = validateColumnAccess(obavezna, columns, "ROW_1");
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("OBAVEZNA_LOCKED");
    });
  });

  describe("directed play", () => {
    it("requires matching row in DOJAVA column", () => {
      expect(validateDirectedSubmit("POKER", "POKER", "DOJAVA").valid).toBe(true);
      expect(validateDirectedSubmit("POKER", "KENTA", "DOJAVA").valid).toBe(
        false
      );
      expect(validateDirectedSubmit("POKER", "KENTA", "DOJAVA").errorCode).toBe(
        "DIRECTED_ROW_MISMATCH"
      );
    });

    it("ignores when no directed row pending", () => {
      expect(validateDirectedSubmit(null, "KENTA", "REDOVNA").valid).toBe(true);
    });
  });

  describe("roll and submit", () => {
    it("blocks roll without najava in NAJAVA column", () => {
      const turn = createTurn("NAJAVA");
      expect(validateRoll(turn).valid).toBe(false);
    });

    it("blocks submit before first roll", () => {
      const turn = createTurn("PREKOREDA");
      turn.rollCount = 0;
      const col = createEmptyColumn("PREKOREDA");
      const result = validateSubmitScore(turn, col, createEmptyScorecard(), "ROW_1", 0);
      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe("NO_ROLL_BEFORE_SCORE");
    });

    it("blocks submit after 3 rolls without valid score", () => {
      const turn: TurnState = {
        ...createTurn("PREKOREDA"),
        rollCount: 3,
        dice: [1, 2, 3, 4, 5],
      };
      const col = createEmptyColumn("PREKOREDA");
      const result = validateSubmitScore(turn, col, createEmptyScorecard(), "ROW_1", 99);
      expect(result.valid).toBe(false);
    });
  });
});
