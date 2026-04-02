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

    //console.info(`getCardComponentKey called with rank: ${rank}, suit: ${suit}, returning key: ${suit}${normalizedRank}`);

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

const getCardRankFromIndex = (cardIndex: number): number => {
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 51) {
        throw new Error(`Invalid card index: ${cardIndex}`);
    }

    return (cardIndex % 13) + 2;
};

const getCardSuitFromIndex = (cardIndex: number): number => {
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 51) {
        throw new Error(`Invalid card index: ${cardIndex}`);
    }

    return Math.floor(cardIndex / 13);
};

const checkStraight = (sortedRanks: readonly [number, number, number, number, number]): boolean => {
    if (
        sortedRanks[0] === sortedRanks[1] + 1
        && sortedRanks[1] === sortedRanks[2] + 1
        && sortedRanks[2] === sortedRanks[3] + 1
        && sortedRanks[3] === sortedRanks[4] + 1
    ) {
        return true;
    }

    if (
        sortedRanks[0] === 14
        && sortedRanks[1] === 5
        && sortedRanks[2] === 4
        && sortedRanks[3] === 3
        && sortedRanks[4] === 2
    ) {
        return true;
    }

    return false;
};

const evaluateFiveCardRank = (cards: readonly [number, number, number, number, number]): number => {
    const ranks: number[] = cards.map((cardIndex: number): number => getCardRankFromIndex(cardIndex));
    const suits: number[] = cards.map((cardIndex: number): number => getCardSuitFromIndex(cardIndex));
    const sortedRanks: [number, number, number, number, number] = [...ranks].sort(
        (left: number, right: number): number => right - left,
    ) as [number, number, number, number, number];

    const isFlush: boolean = suits[0] === suits[1]
        && suits[1] === suits[2]
        && suits[2] === suits[3]
        && suits[3] === suits[4];

    const isStraight: boolean = checkStraight(sortedRanks);

    const rankCounts: number[] = new Array<number>(15).fill(0);
    for (const rank of sortedRanks) {
        rankCounts[rank] += 1;
    }

    let fourOfAKind: number = 0;
    let threeOfAKind: number = 0;
    let pairs: number = 0;

    for (let rank: number = 14; rank >= 2; rank--) {
        if (rankCounts[rank] === 4) {
            fourOfAKind = rank;
        }

        if (rankCounts[rank] === 3) {
            threeOfAKind = rank;
        }

        if (rankCounts[rank] === 2) {
            pairs += 1;
        }
    }

    if (isStraight && isFlush) {
        return 8;
    }

    if (fourOfAKind > 0) {
        return 7;
    }

    if (threeOfAKind > 0 && pairs > 0) {
        return 6;
    }

    if (isFlush) {
        return 5;
    }

    if (isStraight) {
        return 4;
    }

    if (threeOfAKind > 0) {
        return 3;
    }

    if (pairs === 2) {
        return 2;
    }

    if (pairs === 1) {
        return 1;
    }

    return 0;
};

/**
 * Evaluates the best hand rank from two hole cards and five board cards.
 *
 * Ranking values align with `PokerHandEvaluator.HandRank`:
 * - 0: HIGH_CARD
 * - 1: ONE_PAIR
 * - 2: TWO_PAIR
 * - 3: THREE_OF_A_KIND
 * - 4: STRAIGHT
 * - 5: FLUSH
 * - 6: FULL_HOUSE
 * - 7: FOUR_OF_A_KIND
 * - 8: STRAIGHT_FLUSH
 *
 * @param {readonly [bigint, bigint]} holeCards Player's two hole cards.
 * @param {readonly [bigint, bigint, bigint, bigint, bigint]} boardCards Five community cards.
 * @returns {number} Best hand rank as an integer aligned to on-chain `HandRank`.
 */
export const evaluateHandRank = (
    holeCards: readonly [bigint, bigint],
    boardCards: readonly [bigint, bigint, bigint, bigint, bigint],
): number => {
    const allCards: [number, number, number, number, number, number, number] = [
        Number(holeCards[0]),
        Number(holeCards[1]),
        Number(boardCards[0]),
        Number(boardCards[1]),
        Number(boardCards[2]),
        Number(boardCards[3]),
        Number(boardCards[4]),
    ];

    for (const cardIndex of allCards) {
        if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 51) {
            throw new Error(`Invalid card index: ${cardIndex}`);
        }
    }

    let bestRank: number = 0;

    for (let i: number = 0; i < 7; i++) {
        for (let j: number = i + 1; j < 7; j++) {
            const fiveCards: number[] = [];

            for (let cardPosition: number = 0; cardPosition < 7; cardPosition++) {
                if (cardPosition !== i && cardPosition !== j) {
                    fiveCards.push(allCards[cardPosition]);
                }
            }

            if (fiveCards.length !== 5) {
                throw new Error("Failed to build 5-card combination from 7 cards");
            }

            const rank: number = evaluateFiveCardRank([
                fiveCards[0],
                fiveCards[1],
                fiveCards[2],
                fiveCards[3],
                fiveCards[4],
            ]);

            if (rank > bestRank) {
                bestRank = rank;
            }
        }
    }

    return bestRank;
};
/* ************************************************************************ */
