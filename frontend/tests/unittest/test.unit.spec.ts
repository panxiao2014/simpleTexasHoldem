import { expect, test } from "@playwright/test";
import {
	appendCappedHistoryEntry,
	evaluateHandRank,
	getCardComponentKeyFromIndex,
} from "../../app/utils/utils";


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
	const holeCards: readonly [number, number] = [8, 9];
	const boardCards: readonly [number, number, number, number, number] = [
		10,
		11,
		12,
		20,
		33,
	];

	const rank: number = evaluateHandRank(holeCards, boardCards);

	expect(rank).toBe(8);
});

test("evaluateHandRank returns Full House (6)", (): void => {
	const holeCards: readonly [number, number] = [0, 13];
	const boardCards: readonly [number, number, number, number, number] = [
		26,
		4,
		17,
		30,
		45,
	];

	const rank: number = evaluateHandRank(holeCards, boardCards);

	expect(rank).toBe(6);
});

test("evaluateHandRank rejects invalid card indices", (): void => {
	const invalidHoleCards: readonly [number, number] = [-1, 10];
	const boardCards: readonly [number, number, number, number, number] = [
		11,
		12,
		20,
		30,
		40,
	];

	expect((): number => evaluateHandRank(invalidHoleCards, boardCards)).toThrow("Invalid card index: -1");
});
