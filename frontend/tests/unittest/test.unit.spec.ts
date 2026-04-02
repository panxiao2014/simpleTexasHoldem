import { expect, test } from "@playwright/test";
import { MAX_GAME_INFO_BOX_SAVED_ITEMS } from "../../app/utils/gameConfig";
import {
	appendCappedHistoryEntry,
	evaluateHandRank,
	getCardComponentKeyFromIndex,
} from "../../app/utils/utils";


test("appendCappedHistoryEntry keeps max entries and drops oldest", (): void => {
	const existingEntries: string[] = Array.from(
		{ length: MAX_GAME_INFO_BOX_SAVED_ITEMS },
		(_unusedValue: unknown, index: number): string => `entry-${index + 1}`,
	);
	const nextEntry: string = "entry-new";

	const result: string[] = appendCappedHistoryEntry(existingEntries, nextEntry, MAX_GAME_INFO_BOX_SAVED_ITEMS);

	expect(result).toHaveLength(MAX_GAME_INFO_BOX_SAVED_ITEMS);
	expect(result[0]).toBe("entry-2");
	expect(result[result.length - 1]).toBe(nextEntry);
});

test("getCardComponentKeyFromIndex maps contract card indices correctly", (): void => {
	const mappings: Array<{ cardIndex: number; expected: string }> = [
		{ cardIndex: 0, expected: "S2" },
		{ cardIndex: 12, expected: "Sa" },
		{ cardIndex: 24, expected: "Hk" },
		{ cardIndex: 51, expected: "Ca" },
	];

	for (const mapping of mappings) {
		expect(getCardComponentKeyFromIndex(mapping.cardIndex)).toBe(mapping.expected);
	}
});

test("getCardComponentKeyFromIndex rejects invalid indices", (): void => {
	expect((): string => getCardComponentKeyFromIndex(-1)).toThrow("Invalid card index: -1");
	expect((): string => getCardComponentKeyFromIndex(52)).toThrow("Invalid card index: 52");
	expect((): string => getCardComponentKeyFromIndex(1.5)).toThrow("Invalid card index: 1.5");
});

test("evaluateHandRank returns Straight Flush (8)", (): void => {
	const holeCards: readonly [bigint, bigint] = [BigInt(8), BigInt(9)];
	const boardCards: readonly [bigint, bigint, bigint, bigint, bigint] = [
		BigInt(10),
		BigInt(11),
		BigInt(12),
		BigInt(20),
		BigInt(33),
	];

	const rank: number = evaluateHandRank(holeCards, boardCards);

	expect(rank).toBe(8);
});

test("evaluateHandRank returns Full House (6)", (): void => {
	const holeCards: readonly [bigint, bigint] = [BigInt(0), BigInt(13)];
	const boardCards: readonly [bigint, bigint, bigint, bigint, bigint] = [
		BigInt(26),
		BigInt(4),
		BigInt(17),
		BigInt(30),
		BigInt(45),
	];

	const rank: number = evaluateHandRank(holeCards, boardCards);

	expect(rank).toBe(6);
});

test("evaluateHandRank rejects invalid card indices", (): void => {
	const invalidHoleCards: readonly [bigint, bigint] = [BigInt(-1), BigInt(10)];
	const boardCards: readonly [bigint, bigint, bigint, bigint, bigint] = [
		BigInt(11),
		BigInt(12),
		BigInt(20),
		BigInt(30),
		BigInt(40),
	];

	expect((): number => evaluateHandRank(invalidHoleCards, boardCards)).toThrow("Invalid card index: -1");
});
