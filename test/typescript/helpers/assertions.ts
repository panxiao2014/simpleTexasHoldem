// test/helpers/assertions.ts
import assert from "node:assert";

/**
 * Assert that balance changed by expected amount (with tolerance for gas)
 */
export async function assertBalanceChange(
  viem: any,
  address: string,
  action: () => Promise<any>,
  expectedChange: bigint,
  tolerancePercent: number = 1 // 1% tolerance for gas
) {
  const before = await viem.getBalance({ address });
  await action();
  const after = await viem.getBalance({ address });

  const actualChange = after - before;
  const tolerance = (expectedChange * BigInt(tolerancePercent)) / 100n;
  const diff =
    actualChange > expectedChange
      ? actualChange - expectedChange
      : expectedChange - actualChange;

  assert.ok(
    diff <= tolerance,
    `Balance change ${actualChange} not within ${tolerance} of ${expectedChange} (diff: ${diff})`
  );
}

/**
 * Assert that exactly one of the conditions is true
 */
export function assertExactlyOne(
  conditions: boolean[],
  message: string = "Expected exactly one condition to be true"
) {
  const trueCount = conditions.filter((c) => c).length;
  assert.equal(trueCount, 1, message);
}

/**
 * Assert bigint values are equal
 */
export function assertBigIntEqual(
  actual: bigint,
  expected: bigint,
  message?: string
) {
  assert.equal(
    actual,
    expected,
    message || `Expected ${expected}, got ${actual}`
  );
}

/**
 * Assert bigint is within tolerance
 */
export function assertBigIntWithinTolerance(
  actual: bigint,
  expected: bigint,
  tolerance: bigint,
  message?: string
) {
  const diff = actual > expected ? actual - expected : expected - actual;
  assert.ok(
    diff <= tolerance,
    message ||
      `Expected ${expected} ±${tolerance}, got ${actual} (diff: ${diff})`
  );
}

/**
 * Assert that one player won approximately the expected amount
 */
export function assertOnePlayerWon(
  balanceChanges: bigint[],
  expectedWinnings: bigint,
  tolerancePercent: number = 2
) {
  const tolerance = (expectedWinnings * BigInt(tolerancePercent)) / 100n;

  const winnersCount = balanceChanges.filter(
    (change) => change > expectedWinnings - tolerance
  ).length;

  assert.equal(winnersCount, 1, "Expected exactly one winner");
}

/**
 * Assert event was emitted with specific args
 */
export async function assertEventEmitted(
  viem: any,
  contract: any,
  eventName: string,
  txHash: string,
  expectedArgs?: any[]
) {
  const receipt = await viem.getTransactionReceipt({ hash: txHash });
  const logs = await contract.getEvents[eventName]({
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  assert.ok(logs.length > 0, `Event ${eventName} was not emitted`);

  if (expectedArgs) {
    const actualArgs = logs[0].args;
    expectedArgs.forEach((expected, index) => {
      if (expected !== undefined && expected !== null) {
        assert.equal(
          actualArgs[index],
          expected,
          `Event arg ${index} mismatch`
        );
      }
    });
  }

  return logs[0];
}
