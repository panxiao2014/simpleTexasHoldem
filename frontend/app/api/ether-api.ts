import {
    createPublicClient,
    createWalletClient,
    custom,
    decodeEventLog,
    type Address,
    type Chain,
    type Hash,
    type PublicClient,
    type TransactionReceipt,
    type Transport,
    type WalletClient,
} from "viem";

import { SIMPLE_TEXAS_HOLDEM_ABI } from "./contract-abi";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";

interface EthereumProvider {
    request: (args: { method: string; params?: readonly unknown[] | object }) => Promise<unknown>;
}

interface WindowWithEthereum extends Window {
    ethereum?: EthereumProvider;
}

export interface ContractEventLog {
    eventName: string | null;
    args: unknown;
    address: Address;
    data: Hash;
    topics: Hash[];
}

export function createContractPublicClient(
    chain: Chain
): PublicClient<Transport, Chain> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        throw new Error("Wallet provider not found.");
    }

    return createPublicClient({
        chain,
        transport: custom(ethereum),
    });
}

export function createContractWalletClient(
    chain: Chain
): WalletClient<Transport, Chain> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        throw new Error("Wallet provider not found.");
    }

    return createWalletClient({
        chain,
        transport: custom(ethereum),
    });
}

export function parseAccounts(response: unknown): Address[] {
    if (!Array.isArray(response)) {
        return [];
    }

    const accounts: Address[] = [];

    for (const value of response) {
        if (typeof value === "string") {
            accounts.push(value as Address);
        }
    }

    return accounts;
}

export function extractDecodedEvents(receipt: TransactionReceipt): ContractEventLog[] {
    const decodedEvents: ContractEventLog[] = [];

    for (const log of receipt.logs) {
        try {
            const decodedLog = decodeEventLog({
                abi: SIMPLE_TEXAS_HOLDEM_ABI,
                data: log.data,
                topics: log.topics,
            });

            decodedEvents.push({
                eventName: decodedLog.eventName ?? null,
                args: decodedLog.args,
                address: log.address,
                data: log.data,
                topics: [...log.topics],
            });
        } catch {
            decodedEvents.push({
                eventName: null,
                args: null,
                address: log.address,
                data: log.data,
                topics: [...log.topics],
            });
        }
    }

    return decodedEvents;
}

export async function getConnectedAccount(): Promise<Address> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        throw new Error("Wallet provider not found.");
    }

    const walletClient: WalletClient = createContractWalletClient(USING_CHAIN_CONFIG.chain);
    let accounts: readonly Address[] = await walletClient.getAddresses();

    if (accounts.length === 0) {
        const accountResponse: unknown = await ethereum.request({ method: "eth_requestAccounts" });
        accounts = parseAccounts(accountResponse);
    }

    const account: Address | undefined = accounts[0];

    if (account === undefined) {
        throw new Error("No connected account available.");
    }

    return account;
}

export async function getNativeBalance(address: Address): Promise<bigint> {
    const publicClient: PublicClient = createContractPublicClient(USING_CHAIN_CONFIG.chain);
    return await publicClient.getBalance({ address });
}
