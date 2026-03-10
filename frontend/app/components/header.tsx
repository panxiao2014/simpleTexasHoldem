import { ReactNode } from "react";
import { gameRules } from "../rules";
import { FaGithub } from "react-icons/fa";
import { HelpTextModal } from "./help-text-modal";
import { IconLink } from "./icon-link";
import { Select } from "../../src/components/base/select/select";
import { GAME_MODES, type GameMode } from "../utils/utils";

interface HeaderProps {
  gameMode: GameMode;
  onGameModeChange: (mode: GameMode) => void;
}

const modeItems = [
  { id: GAME_MODES.OWNER, label: "Owner" },
  { id: GAME_MODES.PLAYER, label: "Player" },
];

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
 * @returns {ReactNode} The header navigation element
 */
export function Header({ gameMode, onGameModeChange }: HeaderProps): ReactNode {
  return (
    <nav className="fixed top-0 right-0 left-0 z-10 flex justify-between px-4 py-3">
      <Select
        aria-label="Select game mode"
        value={gameMode}
        onChange={(key) => onGameModeChange(key as GameMode)}
        items={modeItems}
        size="sm"
        className="w-36"
      >
        {(item) => <Select.Item id={item.id}>{item.label}</Select.Item>}
      </Select>
      <div className="flex items-center gap-3">
        <HelpTextModal title="Simplified Texas Hold'em Rules" text={gameRules} />
        <IconLink
          icon={FaGithub}
          url="https://github.com/panxiao2014/simpleTexasHoldem"
          ariaLabel="Open GitHub repository"
        />
      </div>
    </nav>
  );
}
