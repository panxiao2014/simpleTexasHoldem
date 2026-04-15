import { CONTRACT_OWNER_ADDRESS } from "./contractInfo";

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
function getConnectedAccount(): string {
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
 * Checks if the connected wallet account is the contract owner.
 *
 * @returns {boolean} true if the connected account is the contract owner.
 */
export function isOwnerAccount(): boolean {
    const account: string = getConnectedAccount();
    return account.toLowerCase() === CONTRACT_OWNER_ADDRESS.toLowerCase();
}
