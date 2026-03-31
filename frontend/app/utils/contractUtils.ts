import { CONTRACT_OWNER_ADDRESS } from "./contractInfo";

interface EthereumProvider {
    request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
}

interface WindowWithEthereum extends Window {
    ethereum?: EthereumProvider;
}

const parseAccounts = (response: unknown): string[] =>
    Array.isArray(response)
        ? response.filter((v: unknown): v is string => typeof v === "string")
        : [];
        
/**
 * Checks if the currently connected wallet account is the contract owner.
 *
 * If no account is connected, triggers MetaMask connection prompt first.
 * Returns false if no wallet is detected, user rejects, or address does not match.
 *
 * @returns {Promise<boolean>} true if the connected account is the contract owner.
 */
export async function isOwnerConnected(): Promise<boolean> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        console.info("Wallet not detected");
        return false;
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
        console.info("No accounts found after connection attempt");
        return false;
    }

    const isOwner: boolean = accounts[0].toLowerCase() === CONTRACT_OWNER_ADDRESS.toLowerCase();
    console.info(`Connected account: ${accounts[0]}, Is owner: ${isOwner}`);
    return isOwner;
}