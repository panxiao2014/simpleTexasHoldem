// test/helpers/fixtures.ts
import { parseEther } from "viem";

/**
 * Deploy SimpleTexasHoldem contract in ETH mode
 */
export async function deployGameContract(viem: any) {
  const game = await viem.deployContract("SimpleTexasHoldem", [
    "0x0000000000000000000000000000000000000000", // ETH mode
  ]);
  return game;
}

/**
 * Setup a game with specified number of players
 */
export async function setupGameWithPlayers(
  viem: any,
  game: any,
  playerCount: number = 2
) {
  const wallets = await viem.getWalletClients();
  const owner = wallets[0];
  const players = wallets.slice(1, playerCount + 1);

  // Start game (1 hour duration)
  await game.write.startGame([3600n], { account: owner.account });

  return { owner, players };
}

/**
 * Have players join the game
 */
export async function playersJoinGame(
  game: any,
  players: any[]
) {
  for (const player of players) {
    await game.write.joinGame({ account: player.account });
  }
}

/**
 * Have players place bets
 */
export async function playersPlaceBets(
  game: any,
  players: any[],
  betAmounts: bigint[]
) {
  if (players.length !== betAmounts.length) {
    throw new Error("Players and bet amounts must have same length");
  }

  for (let i = 0; i < players.length; i++) {
    await game.write.placeBet([0n], {
      account: players[i].account,
      value: betAmounts[i],
    });
  }
}

/**
 * Get balances for multiple addresses
 */
export async function getBalances(
  viem: any,
  addresses: string[]
): Promise<bigint[]> {
  const balances: bigint[] = [];
  for (const address of addresses) {
    const balance = await viem.getBalance({ address });
    balances.push(balance);
  }
  return balances;
}

/**
 * Standard test game setup - 2 players ready to play
 */
export async function setupStandardGame(viem: any) {
  const wallets = await viem.getWalletClients();
  const [owner, player1, player2] = wallets;

  const game = await deployGameContract(viem);
  await game.write.startGame([3600n], { account: owner.account });

  return {
    game,
    owner,
    player1,
    player2,
    allPlayers: [player1, player2],
  };
}
