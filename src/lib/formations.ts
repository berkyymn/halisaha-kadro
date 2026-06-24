import type {
  Formation,
  FormationRow,
  FormationRowRole,
  FormationSlot,
  SquadSize,
} from "@/types";

const GK_X = 12;
const OUTFIELD_X_MIN = 23;
const OUTFIELD_X_MAX = 44;

function inferRowRole(rowIndex: number, totalRows: number): FormationRowRole {
  if (rowIndex === 0) return "GK";
  const outfield = totalRows - 1;
  const outfieldIndex = rowIndex - 1;
  if (outfield === 1) return "MID";
  if (outfield === 2) {
    return outfieldIndex === 0 ? "DEF" : "ATT";
  }
  if (outfieldIndex === 0) return "DEF";
  if (outfieldIndex === outfield - 1) return "ATT";
  return "MID";
}

function rowDepthX(rowIndex: number, totalRows: number): number {
  if (rowIndex === 0) return GK_X;
  const outfield = totalRows - 1;
  const lineIndex = rowIndex - 1;
  if (outfield <= 1) return OUTFIELD_X_MAX;
  return (
    OUTFIELD_X_MIN +
    (lineIndex / (outfield - 1)) * (OUTFIELD_X_MAX - OUTFIELD_X_MIN)
  );
}

function roleLabel(role: FormationRowRole): string {
  switch (role) {
    case "GK":
      return "K";
    case "DEF":
      return "D";
    case "MID":
      return "O";
    case "ATT":
      return "F";
  }
}

function buildFormation(
  id: string,
  name: string,
  squadSize: SquadSize,
  rowCounts: number[]
): Formation {
  const total = rowCounts.reduce((a, b) => a + b, 0);
  if (total !== squadSize) {
    throw new Error(`Formation ${id} has ${total} slots, expected ${squadSize}`);
  }

  const rows: FormationRow[] = rowCounts.map((count, rowIndex) => ({
    count,
    role: inferRowRole(rowIndex, rowCounts.length),
  }));

  const slots: FormationSlot[] = [];
  rows.forEach((row, rowIndex) => {
    const x = rowDepthX(rowIndex, rows.length);
    for (let colIndex = 0; colIndex < row.count; colIndex++) {
      slots.push({
        x,
        y: 50,
        label: roleLabel(row.role),
        rowIndex,
        isGoalkeeper: row.role === "GK",
      });
    }
  });

  return { id, name, squadSize, rows, slots };
}

export const FORMATIONS: Formation[] = [
  buildFormation("6-1-2-1-2", "1-2-1-2", 6, [1, 2, 1, 2]),
  buildFormation("6-2-2-1", "2-2-1", 6, [1, 2, 2, 1]),
  buildFormation("6-1-3-1", "1-3-1", 6, [1, 3, 1, 1]),

  buildFormation("7-1-3-2", "1-3-2", 7, [1, 3, 2, 1]),
  buildFormation("7-1-3-3", "1-3-3", 7, [1, 3, 3]),
  buildFormation("7-2-2-2", "2-2-2", 7, [1, 2, 2, 2]),
  buildFormation("7-1-2-3", "1-2-3", 7, [1, 2, 3, 1]),

  buildFormation("8-1-3-3", "1-3-3", 8, [1, 3, 3, 1]),
  buildFormation("8-2-3-2", "2-3-2", 8, [1, 2, 3, 2]),
  buildFormation("8-1-4-2", "1-4-2", 8, [1, 4, 2, 1]),
];

export function getFormationsForSize(size: SquadSize): Formation[] {
  return FORMATIONS.filter((f) => f.squadSize === size);
}

export function getFormationById(id: string): Formation | undefined {
  return FORMATIONS.find((f) => f.id === id);
}

export function mirrorSlotX(x: number): number {
  return 100 - x;
}

export { GK_X, OUTFIELD_X_MIN, OUTFIELD_X_MAX };
