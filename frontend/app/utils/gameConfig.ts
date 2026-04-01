export const GAME_MODES = {
    OWNER: "owner",
    PLAYER: "player",
    CARDS: "cards",
} as const;

export type GameMode = (typeof GAME_MODES)[keyof typeof GAME_MODES];

export const DEFAULT_GAME_DURATION_SECONDS: bigint = 3600n;

// consts related to game info box display:
export const OWNER_STORAGE_KEY: string = "owner-game-log-entries";
export const PLAYER_STORAGE_KEY: string = "player-game-log-entries";
export const CONTRACT_EVENT_STORAGE_KEY: string = "contract-event-entries";
export const MAX_GAME_INFO_BOX_SAVED_ITEMS: number = 1000;
export const DEFAULT_GAME_INFO_BOX_DISPLAY_ITEMS: number = 10;