import { expect, test } from "@playwright/test";
import { MAX_GAME_INFO_BOX_SAVED_ITEMS } from "../../app/utils/gameConfig";
import { appendCappedHistoryEntry, getCardComponentKeyFromIndex } from "../../app/utils/utils";


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
