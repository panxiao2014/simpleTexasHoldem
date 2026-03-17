import { useEffect, useRef, useState, type ReactNode } from "react";
import { TextArea } from "../../src/components/base/textarea/textarea";
import { Button } from "../../src/components/base/buttons/button";
import { MAX_GAME_HIST_ENTRIES, MAX_GAME_HIST_DISPLAY_ENTRIES } from "../utils/gameConfig";
import { appendCappedHistoryEntry } from "../utils/utils";


// Reads persisted log entries from localStorage.
// Returns an empty array if no entries exist or parsing fails.
const loadEntriesFromStorage = (storageKey: string): string[] => {
    try {
        const stored: string | null = localStorage.getItem(storageKey);
        if (stored === null) {
            return [];
        }
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every((item: unknown): boolean => typeof item === "string")) {
            return parsed as string[];
        }
        return [];
    } catch {
        return [];
    }
};

type GameInfoLogProps = {
    info: string;
    storageKey: string;
};

/**
 * GameInfoLog component for timestamped game information history.
 *
 * Purpose:
 * Displays game info messages in a scrollable log where each entry is prefixed with a timestamp.
 * Entries are persisted in localStorage so they survive page switches, reloads, and browser close/reopen
 * as long as the web server is still running. Clearing localStorage removes the history.
 *
 * Props:
 * - `info` (string): Latest game info message to append to the log when it changes.
 * - `storageKey` (string): localStorage key used to persist/reload history for this page.
 * Usage:
 * Render this component in a page and pass new info strings over time (for example, "Game started").
 * The component keeps older entries and auto-scrolls to the latest message.
 *
 * @param {GameInfoLogProps} props - Game info log props.
 * @returns {ReactNode} A titled, scrollable game info log display.
 */
export function GameInfoLog({ info, storageKey }: GameInfoLogProps): ReactNode {
    const [entries, setEntries] = useState<string[]>((): string[] => loadEntriesFromStorage(storageKey));
    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    const handleClearClick = (): void => {
        setEntries([]);
        localStorage.removeItem(storageKey);
    };

    useEffect((): void => {
        setEntries(loadEntriesFromStorage(storageKey));
    }, [storageKey]);

    useEffect((): void => {
        const trimmedInfo: string = info.trim();

        if (trimmedInfo.length === 0) {
            return;
        }

        const timestamp: string = new Date().toLocaleTimeString();
        const prefixedInfo: string = `[${timestamp}] ${trimmedInfo}`;

        setEntries((previousEntries: string[]): string[] => {
            return appendCappedHistoryEntry(previousEntries, prefixedInfo, MAX_GAME_HIST_ENTRIES);
        });
    }, [info]);

    // Persists entries to localStorage so history survives page reloads and browser close/reopen.
    useEffect((): void => {
        localStorage.setItem(storageKey, JSON.stringify(entries));
    }, [entries, storageKey]);

    useEffect((): void => {
        if (textAreaRef.current !== null) {
            textAreaRef.current.scrollTop = textAreaRef.current.scrollHeight;
        }
    }, [entries]);

    const entriesText: string = entries.join("\n");

    return (
        <section className="rounded-lg border border-secondary bg-primary p-4" data-testid="game-info-log">
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-primary">Game History</h3>

                <Button
                    size="sm"
                    color="secondary"
                    isDisabled={entries.length === 0}
                    data-testid="game-info-log-clear"
                    onClick={handleClearClick}
                >
                    Clear
                </Button>
            </div>

            {/* TextArea displays read-only history and keeps vertical scrolling for older entries. */}
            <TextArea
                aria-label="Game info log"
                value={entriesText}
                isReadOnly
                rows={MAX_GAME_HIST_DISPLAY_ENTRIES}
                textAreaRef={textAreaRef}
                textAreaClassName="resize-none overflow-y-auto font-mono text-sm"
                placeholder="Game updates will appear here."
            />
        </section>
    );
}
