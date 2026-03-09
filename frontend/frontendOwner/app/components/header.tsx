import { gameRules } from "../rules";
import { FaGithub } from "react-icons/fa";
import { HelpTextModal } from "./help-text-modal";
import { IconLink } from "./icon-link";

export function Header() {
  return (
    <nav className="fixed top-0 right-0 left-0 z-10 flex justify-end px-4 py-3">
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
