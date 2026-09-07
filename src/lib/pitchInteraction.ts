import type { TeamMode } from "@/lib/posterSnapshot";

export type PitchMovementPolicy = {
  dragXMin: number;
  dragXMax: number;
  dragYMin: number;
  dragYMax: number;
  dropXMin: number;
  dropXMax: number;
  dropYMin: number;
  dropYMax: number;
  canMoveGoalkeeper: boolean;
  allowedSwapTeams: ("home" | "away")[];
};

const FULL_PITCH_POLICY: PitchMovementPolicy = {
  // Geniş drag sınırları: oyuncu kartını saha dışındaki yedekler paneline kadar sürüklenebilir.
  dragXMin: -20,
  dragXMax: 120,
  dragYMin: -10,
  dragYMax: 110,
  dropXMin: 4,
  dropXMax: 96,
  dropYMin: 6,
  dropYMax: 94,
  canMoveGoalkeeper: false,
  allowedSwapTeams: ["home"],
};

export function getPitchMovementPolicy(
  mode: TeamMode,
  team: "home" | "away"
): PitchMovementPolicy {
  if (mode === "single") return FULL_PITCH_POLICY;
  return team === "home"
    ? { ...FULL_PITCH_POLICY, dropXMax: 48, allowedSwapTeams: ["home", "away"] }
    : { ...FULL_PITCH_POLICY, dropXMin: 52, allowedSwapTeams: ["home", "away"] };
}

export function clampPitchPosition(
  x: number,
  y: number,
  policy: PitchMovementPolicy
): { x: number; y: number } {
  return {
    x: Math.max(policy.dragXMin, Math.min(policy.dragXMax, x)),
    y: Math.max(policy.dragYMin, Math.min(policy.dragYMax, y)),
  };
}
