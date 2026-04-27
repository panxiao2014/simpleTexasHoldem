import { type Key, type ReactNode } from "react";
import { gameRules } from "../rules";
import { FaGithub } from "react-icons/fa";
import { HelpTextModal } from "./help-text-modal";
import { IconLink } from "./icon-link";
import { Select } from "../../src/components/base/select/select";
import { GAME_MODES, type GameMode, MAX_PLAYERS_PER_GAME } from "../utils/gameConfig";
import { type GameRecordFrontend } from "../types/gameRecordFrontend";

interface HeaderProps {
    gameMode: GameMode;
    onGameModeChange: (mode: GameMode) => void;
    latestGame: GameRecordFrontend;
}

const modeItems: Array<{ id: GameMode; label: string }> = [
    { id: GAME_MODES.OWNER, label: "Owner" },
    { id: GAME_MODES.PLAYER, label: "Player" },
];


/**
 * Generate the status text based on the latest game state
 * @param latestGame - The latest game record or null
 * @returns Status string to display in the header
 */
function getGameStatusText(latestGame: GameRecordFrontend | null): string {
    if (!latestGame) {
        return "No active game. Wait for a new game begin.";
    }

    const gameId = latestGame.gameId.toString();
    const currentPlayers = latestGame.playerInfoItems.length;

    if (latestGame.isGameStarted) {
        const remainingSeats = MAX_PLAYERS_PER_GAME - currentPlayers;
        return `Game round ${gameId} started. ${remainingSeats} seats remains.`;
    } else {
        return `Game round ${gameId} ended. Wait for the next round.`;
    }
}

/**
 * Header component for the Texas Hold'em application.
 *
 * Displays a navigation bar with:
 * - Game mode selector (Owner/Player) on the left
 * - Help modal and GitHub link on the right
 *
 * @component
 * @param {HeaderProps} props - Component props
 * @param {GameMode} props.gameMode - Current game mode
 * @param {(mode: GameMode) => void} props.onGameModeChange - Callback when game mode changes
 * @param {GameRecordFrontend} props.latestGame - The latest game record
 */
export function Header({ gameMode, onGameModeChange, latestGame }: HeaderProps): ReactNode {
    const gameStatusText = getGameStatusText(latestGame);

    return (
        <nav className="fixed top-0 right-0 left-0 z-10 flex justify-between px-4 py-3" data-testid="app-header">

            {/* Select allows switching between Owner and Player game modes. */}
            <Select
                aria-label="Select game mode"
                data-testid="game-mode-select"
                value={gameMode}
                onChange={(key: Key | null) => key !== null && onGameModeChange(key as GameMode)}
                items={modeItems}
                size="sm"
                className="w-36"
            >
                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>

            {/* Dynamic game status display */}
            <div className="flex items-center justify-center text-lg font-medium text-gray-700 dark:text-gray-300">
                {gameStatusText}
            </div>

            <div className="flex items-center gap-3">

                {/* HelpTextModal displays the simplified Texas Hold'em rules for quick reference. */}
                <HelpTextModal title="Simplified Texas Hold'em Rules" text={gameRules} />

                {/* IconLink renders a clickable GitHub icon that opens the project repository URL. */}
                <IconLink
                    icon={FaGithub}
                    url="https://github.com/panxiao2014/simpleTexasHoldem"
                    ariaLabel="Open GitHub repository"
                />

            </div>

        </nav>
    );
}
