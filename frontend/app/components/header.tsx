import { type Key, type ReactNode } from "react";
import { gameRules } from "../rules";
import { FaGithub } from "react-icons/fa";
import { HelpTextModal } from "./help-text-modal";
import { IconLink } from "./icon-link";
import { Select } from "../../src/components/base/select/select";
import { GAME_MODES, type GameMode } from "../utils/gameConfig";

interface HeaderProps {
    gameMode: GameMode;
    onGameModeChange: (mode: GameMode) => void;
}

const modeItems: Array<{ id: GameMode; label: string }> = [
    { id: GAME_MODES.OWNER, label: "Owner" },
    { id: GAME_MODES.PLAYER, label: "Player" },
    { id: GAME_MODES.CARDS, label: "Cards" },
];

/**
 * Header component for the Texas Hold'em application.
 *
 * Displays a navigation bar with:
 * - Game mode selector (Owner/Player/Cards) on the left
 * - Help modal and GitHub link on the right
 *
 * @component
 * @param {HeaderProps} props - Component props
 * @param {GameMode} props.gameMode - Current game mode
 * @param {(mode: GameMode) => void} props.onGameModeChange - Callback when game mode changes
 * @returns {ReactNode} The header navigation element
 */
export function Header({ gameMode, onGameModeChange }: HeaderProps): ReactNode {
    return (
        <nav className="fixed top-0 right-0 left-0 z-10 flex justify-between px-4 py-3" data-testid="app-header">

            {/* Select allows switching between Owner and Player game modes. */}
            <Select
                aria-label="Select game mode"
                data-testid="game-mode-select"
                value={gameMode}
                onChange={(key: Key) => onGameModeChange(key as GameMode)}
                items={modeItems}
                size="sm"
                className="w-36"
            >
                {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
            </Select>

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
