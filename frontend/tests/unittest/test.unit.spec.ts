import { expect, test, type Locator, type Page } from "@playwright/test";
import { MAX_GAME_HIST_ENTRIES } from "../../app/utils/gameConfig";
import { appendCappedHistoryEntry } from "../../app/utils/utils";

test("github icon points to the repository URL", async ({ page }: { page: Page }): Promise<void> => {
	const expectedGithubUrl: string = "https://github.com/panxiao2014/simpleTexasHoldem";

	await page.goto("/");

	const githubLink: Locator = page.getByRole("link", { name: "Open GitHub repository" });


	await expect(githubLink).toHaveAttribute("href", expectedGithubUrl);
});

test("appendCappedHistoryEntry keeps max entries and drops oldest", (): void => {
	const existingEntries: string[] = Array.from(
		{ length: MAX_GAME_HIST_ENTRIES },
		(_unusedValue: unknown, index: number): string => `entry-${index + 1}`,
	);
	const nextEntry: string = "entry-new";

	const result: string[] = appendCappedHistoryEntry(existingEntries, nextEntry, MAX_GAME_HIST_ENTRIES);

	expect(result).toHaveLength(MAX_GAME_HIST_ENTRIES);
	expect(result[0]).toBe("entry-2");
	expect(result[result.length - 1]).toBe(nextEntry);
});
