// test/helpers/utils.ts
import { parseEther, formatEther } from "viem";

/**
 * Calculate expected pot, house fee, and net pot
 */
export async function calculateExpectedPayout(
  bets: bigint[],
  game: any
): Promise<{ pot: bigint; houseFee: bigint; netPot: bigint; minBet: bigint }> {
  // always pull the house fee percent from the deployed contract; this keeps
  // the helper consistent with whatever constant is defined on-chain.
  const houseFeePercent: bigint = await game.read.HOUSE_FEE_PERCENTAGE();

  const minBet = bets.reduce((min, bet) => (bet < min ? bet : min), bets[0]);
  const pot = minBet * BigInt(bets.length);
  const houseFee = (pot * houseFeePercent) / 100n;
  const netPot = pot - houseFee;

  return { pot, houseFee, netPot, minBet };
}

/**
 * Calculate expected winnings for a winner (accounting for potential split)
 */
export function calculateWinnings(
  totalPot: bigint,
  houseFeePercent: bigint,
  numWinners: number = 1
): bigint {
  const houseFee = (totalPot * houseFeePercent) / 100n;
  const netPot = totalPot - houseFee;
  return netPot / BigInt(numWinners);
}

/**
 * Parse ether helper (re-export for convenience)
 */
export { parseEther, formatEther };

/**
 * Generate random bet amounts for testing
 */
export function generateRandomBets(
  count: number,
  minEth: number = 1,
  maxEth: number = 5
): bigint[] {
  const bets: bigint[] = [];
  for (let i = 0; i < count; i++) {
    const randomEth = minEth + Math.random() * (maxEth - minEth);
    bets.push(parseEther(randomEth.toFixed(4)));
  }
  return bets;
}

/**
 * Create array of sequential integers
 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format balance changes for logging
 */
export function formatBalanceChanges(
  changes: bigint[],
  labels?: string[]
): string {
  return changes
    .map((change, i) => {
      const label = labels?.[i] || `Player ${i + 1}`;
      const sign = change >= 0n ? "+" : "";
      return `${label}: ${sign}${formatEther(change)} ETH`;
    })
    .join(", ");
}
