import { CONTRACT_OWNER_ADDRESS } from "./contractInfo";

interface EthereumProvider {
    request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
}

interface WindowWithEthereum extends Window {
    ethereum?: EthereumProvider;
}

const parseAccounts = (response: unknown): string[] =>
    Array.isArray(response)
        ? response.filter((v: unknown): v is string => typeof v === "string")
        : [];

/**
 * Formats a log string by prepending a timestamp.
 *
 * @param {string} message The raw log message to format.
 * @param {string} [stage] Optional stage label to prepend before the message.
 * @returns {string} The message prefixed with a locale timestamp, e.g. "[3/24/2026, 10:00:00 AM] Join: message".
 */
export const formatLogString = (message: string, stage?: string): string => {
    const timestamp: string = new Date().toLocaleString();

    if (typeof stage === "string" && stage.trim().length > 0) {
        return `[${timestamp}] ${stage}: ${message}`;
    }

    return `[${timestamp}] ${message}`;
};

/**
 * Appends a new history entry and enforces a maximum entry count.
 *
 * @param {string[]} previousEntries Existing history entries.
 * @param {string} nextEntry New entry to append.
 * @param {number} maxEntries Maximum number of entries to keep.
 * @returns {string[]} Updated history entries capped to maxEntries.
 */
export const appendCappedHistoryEntry = (
    previousEntries: string[],
    nextEntry: string,
    maxEntries: number,
): string[] => {
    const entriesAfterAppend: string[] = [...previousEntries, nextEntry];

    if (entriesAfterAppend.length <= maxEntries) {
        return entriesAfterAppend;
    }

    return entriesAfterAppend.slice(entriesAfterAppend.length - maxEntries);
};



/**
 * Checks if the currently connected wallet account is the contract owner.
 *
 * If no account is connected, triggers MetaMask connection prompt first.
 * Returns false if no wallet is detected, user rejects, or address does not match.
 *
 * @returns {Promise<boolean>} true if the connected account is the contract owner.
 */
export async function isOwnerConnected(): Promise<boolean> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        console.info("Wallet not detected");
        return false;
    }

    let accounts: string[] = parseAccounts(
        await ethereum.request({ method: "eth_accounts" }),
    );

    if (accounts.length === 0) {
        console.info("Triggering wallet connection...");
        accounts = parseAccounts(
            await ethereum.request({ method: "eth_requestAccounts" }),
        );
    }

    if (accounts.length === 0) {
        console.info("No accounts found after connection attempt");
        return false;
    }

    const isOwner: boolean = accounts[0].toLowerCase() === CONTRACT_OWNER_ADDRESS.toLowerCase();
    console.info(`Connected account: ${accounts[0]}, Is owner: ${isOwner}`);
    return isOwner;
}


/* *************************  Poker card utilities  ************************* */
/**
 * Builds the playing-cards component key from rank and suit.
 *
 * @param {string} rank Card rank value ("A", "2" ... "10", "J", "Q", "K").
 * @param {string} suit Card suit prefix used by the card library ("S", "H", "D", "C").
 * @returns {string} The component key expected by @letele/playing-cards (e.g. "Sa", "S10").
 */
export const getCardComponentKey = (rank: string, suit: string): string => {
    const normalizedRank: string = rank === "10" ? rank : rank.toLowerCase();

    console.info(`getCardComponentKey called with rank: ${rank}, suit: ${suit}, returning key: ${suit}${normalizedRank}`);

    return `${suit}${normalizedRank}`;
};

/**
 * Maps a contract card index (0-51) to the playing-cards component key.
 *
 * Contract encoding follows the on-chain evaluator:
 * - suit = Math.floor(cardIndex / 13) with 0=Spades, 1=Hearts, 2=Diamonds, 3=Clubs
 * - rank = (cardIndex % 13) + 2 with 11=J, 12=Q, 13=K, 14=A
 *
 * @param {number} cardIndex Contract card index in the range 0-51.
 * @returns {string} The component key expected by @letele/playing-cards (e.g. "S2", "Sa", "Hk").
 * @throws {Error} Throws when cardIndex is not an integer in the range 0-51.
 */
export const getCardComponentKeyFromIndex = (cardIndex: number): string => {
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 51) {
        throw new Error(`Invalid card index: ${cardIndex}`);
    }

    const suitIndex: number = Math.floor(cardIndex / 13);
    const rankValue: number = (cardIndex % 13) + 2;
    const suitsByIndex: string[] = ["S", "H", "D", "C"];
    const rankByValue: Record<number, string> = {
        2: "2",
        3: "3",
        4: "4",
        5: "5",
        6: "6",
        7: "7",
        8: "8",
        9: "9",
        10: "10",
        11: "j",
        12: "q",
        13: "k",
        14: "a",
    };
    const suit: string = suitsByIndex[suitIndex];
    const rank: string | undefined = rankByValue[rankValue];

    if (rank === undefined) {
        throw new Error(`Invalid derived card rank: ${rankValue}`);
    }

    return getCardComponentKey(rank, suit);
};
/* ************************************************************************ */
