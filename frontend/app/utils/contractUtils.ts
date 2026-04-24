import { CONTRACT_OWNER_ADDRESS } from "./contractInfo";
import { type GameRecordFrontend } from "../types/gameRecordFrontend";

interface EthereumProvider {
    request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
}

interface WindowWithEthereum extends Window {
    ethereum?: EthereumProvider;
}

// The currenctly connected wallet account address. 
let connectedAccount: string = "";

/**
 * Sets the connected account address.
 *
 * @param {string} account The account address to set.
 * @returns {void} No return value.
 */
export function setConnectedAccount(account: string): void {
    connectedAccount = account;
}

/**
 * Gets the connected account address.
 *
 * @returns {string} The connected account address, or empty string if not connected.
 */
export function getConnectedAccount(): string {
    return connectedAccount;
}

const parseAccounts = (response: unknown): string[] =>
    Array.isArray(response)
        ? response.filter((v: unknown): v is string => typeof v === "string")
        : [];

/**
 * Initializes wallet connection by requesting user to connect their account.
 *
 * Attempts to retrieve connected accounts from the Ethereum provider.
 * If no accounts are connected, triggers the wallet connection prompt.
 * Stores the connected account address in connectedAccount state.
 *
 * @returns {Promise<void>} No return value.
 */
export async function initWalletConnection(): Promise<void> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        console.error("Wallet not detected");
        return;
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
        console.warn("No accounts found after connection attempt");
    } else {
        setConnectedAccount(accounts[0]);
    }
}

/**
 * Checks if a wallet account address is the contract owner.
 *
 * @param {string} account The account address to check.
 * @returns {boolean} true if the connected account is the contract owner.
 */
export function isOwnerAccount(account: string): boolean {
    return account.toLowerCase() === CONTRACT_OWNER_ADDRESS.toLowerCase();
}


/**
 * Checks if an account is in the player list of a Convex game record.
 *
 * @param {string} account The account address to check.
 * @returns {boolean} true if the connected account is in the player list.
 */
export function isUserInConvexGameRecord(account: string, gameRecord: GameRecordFrontend): boolean {
    return gameRecord.playerInfoItems.some((playerInfo) => playerInfo.player.toLowerCase() === account.toLowerCase());
}

/**
 * Check if an user is folded in a Convex game record.
 * @param account 
 * @param gameRecord 
 * @returns {boolean} true if the user is in the game record and folded, false otherwise.
 */
export function isUserFolded(account: string, gameRecord: GameRecordFrontend): boolean {
    const playerInfo = gameRecord.playerInfoItems.find(
        (playerInfo) => playerInfo.player.toLowerCase() === account.toLowerCase()
    );
    return playerInfo?.isFolded ?? false;
}


/**
 * Check if an user is bet in a Convex game record.
 * @param account 
 * @param gameRecord 
 * @returns {boolean} true if the user is in the game record and bet, false otherwise.
 */
export function isUserBet(account: string, gameRecord: GameRecordFrontend): boolean {
    //find the player info for the given account. If found, also find the index of the player info in the playerInfoItems array. Use that index in the game record's betAmounts array to check if the bet amount is greater than 0.
    const playerIndex = gameRecord.playerInfoItems.findIndex(
        (playerInfo) => playerInfo.player.toLowerCase() === account.toLowerCase()
    );

    if (playerIndex === -1) {
        return false;
    }

    return gameRecord.playerInfoItems[playerIndex].betAmount > 0;
}
