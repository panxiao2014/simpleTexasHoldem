export const GAME_MODES = {
  OWNER: "owner",
  PLAYER: "player",
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];
