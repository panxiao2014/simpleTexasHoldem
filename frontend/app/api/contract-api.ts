import {
    createPublicClient,
    createWalletClient,
    custom,
    decodeEventLog,
    type Address,
    type Hash,
    type PublicClient,
    type TransactionReceipt,
    type Transport,
    type WalletClient,
} from "viem";

import { SIMPLE_TEXAS_HOLDEM_ABI } from "./contract-abi";
import { CONTRACT_ADDRESS } from "../utils/contractInfo";
import { HARDHAT_CHAIN } from "../utils/gameConfig";
import { type CurrentGameInfo } from "../utils/contractParse";

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

export interface ContractCallResult {
    transactionHash: Hash;
    status: TransactionReceipt["status"];
    events: ContractEventLog[];
}

function createContractPublicClient(): PublicClient<Transport, typeof HARDHAT_CHAIN> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        throw new Error("Wallet provider not found.");
    }

    return createPublicClient({
        chain: HARDHAT_CHAIN,
        transport: custom(ethereum),
    });
}

function createContractWalletClient(): WalletClient<Transport, typeof HARDHAT_CHAIN> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        throw new Error("Wallet provider not found.");
    }

    return createWalletClient({
        chain: HARDHAT_CHAIN,
        transport: custom(ethereum),
    });
}

function parseAccounts(response: unknown): Address[] {
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

function extractDecodedEvents(receipt: TransactionReceipt): ContractEventLog[] {
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

async function getConnectedAccount(): Promise<Address> {
    const { ethereum } = window as WindowWithEthereum;

    if (ethereum === undefined) {
        throw new Error("Wallet provider not found.");
    }

    const walletClient: WalletClient = createContractWalletClient();
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
    const publicClient: PublicClient = createContractPublicClient();
    return await publicClient.getBalance({ address });
}

export async function getCurrentGameInfo(): Promise<CurrentGameInfo> {
    const publicClient: PublicClient = createContractPublicClient();

    const result: readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean] =
        (await publicClient.readContract({
            address: CONTRACT_ADDRESS as Address,
            abi: SIMPLE_TEXAS_HOLDEM_ABI,
            functionName: "getCurrentGameInfo",
        })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint, boolean];

    const gameInfo: CurrentGameInfo = {
        gameId: result[0],
        startTime: result[1],
        endTime: result[2],
        playerCount: result[3],
        totalParticipations: result[4],
        cardsRemaining: result[5],
        gameActive: result[6],
    };

    console.log("Current Game Info:", gameInfo);

    return gameInfo;
}

export async function startGame(duration: bigint): Promise<ContractCallResult> {
    const walletClient: WalletClient<Transport, typeof HARDHAT_CHAIN> = createContractWalletClient();
    const publicClient: PublicClient<Transport, typeof HARDHAT_CHAIN> = createContractPublicClient();
    const account: Address = await getConnectedAccount();

    const transactionHash: Hash = await walletClient.writeContract({
        account,
        address: CONTRACT_ADDRESS as Address,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        functionName: "startGame",
        args: [duration],
    });

    const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
    });

    const events: ContractEventLog[] = extractDecodedEvents(receipt);

    return {
        transactionHash,
        status: receipt.status,
        events,
    };
}

export async function getAccumulatedHouseFees(): Promise<bigint> {
    const publicClient: PublicClient = createContractPublicClient();

    return (await publicClient.readContract({
        address: CONTRACT_ADDRESS as Address,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        functionName: "accumulatedHouseFees",
    })) as bigint;
}

export async function endGame(): Promise<ContractCallResult> {
    const walletClient: WalletClient<Transport, typeof HARDHAT_CHAIN> = createContractWalletClient();
    const publicClient: PublicClient<Transport, typeof HARDHAT_CHAIN> = createContractPublicClient();
    const account: Address = await getConnectedAccount();

    const transactionHash: Hash = await walletClient.writeContract({
        account,
        address: CONTRACT_ADDRESS as Address,
        abi: SIMPLE_TEXAS_HOLDEM_ABI,
        functionName: "endGame",
        args: [],
    });

    const receipt: TransactionReceipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
    });

    const events: ContractEventLog[] = extractDecodedEvents(receipt);

    return {
        transactionHash,
        status: receipt.status,
        events,
    };
}
