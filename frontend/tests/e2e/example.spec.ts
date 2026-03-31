import { test, expect } from '@playwright/test';
import { type Locator, type Page } from "@playwright/test";

test("github icon points to the repository URL", async ({ page }: { page: Page }): Promise<void> => {
  const expectedGithubUrl: string = "https://github.com/panxiao2014/simpleTexasHoldem";

  await page.goto("/");

  const githubLink: Locator = page.getByRole("link", { name: "Open GitHub repository" });


  await expect(githubLink).toHaveAttribute("href", expectedGithubUrl);
});
