import {
	type Address,
	type Chain,
	type Hash,
	type PublicClient,
	type TransactionReceipt,
	type Transport,
	type WalletClient,
} from "viem";

import { SIMPLE_TEXAS_HOLDEM_ABI } from "./contract-abi";
import { CONTRACT_ADDRESS } from "../utils/contractInfo";
import { USING_CHAIN_CONFIG } from "../utils/netConfig";
import { formatLogString } from "../utils/utils";
import { type ContractCallResult } from "./contract-api";
import {
	createContractPublicClient,
	createContractWalletClient,
	extractDecodedEvents,
	getConnectedAccount,
	type ContractEventLog,
} from "./ether-api";

type OwnerActionFunctionName = "startGame" | "endGame" | "withdrawHouseFees";

function formatContractCallResultSummary(result: ContractCallResult): string {
	const eventNames: string[] = result.events.map((eventLog: ContractEventLog): string => {
		if (typeof eventLog.eventName === "string" && eventLog.eventName.length > 0) {
			return eventLog.eventName;
		}

		return "UnknownEvent";
	});
	const eventNamesLabel: string = eventNames.length > 0 ? `[${eventNames.join(", ")}]` : "[]";

	return `status=${result.status}, transactionHash=${result.transactionHash}, events=${result.events.length}, eventNames=${eventNamesLabel}`;
}

/**
 * Formats owner action status text with timestamp and optional transaction result details.
 *
 * @param {string} message Base owner action message.
 * @param {ContractCallResult} [result] Optional contract call result to include in the formatted output.
 * @returns {string} Timestamped owner action text.
 */
export function formatOwnerActionResult(message: string, result?: ContractCallResult): string {
	if (result === undefined) {
		return formatLogString(`[Owner Action] ${message}`);
	}

	const resultSummary: string = formatContractCallResultSummary(result);
	return formatLogString(`[Owner Action] ${message} | ${resultSummary}`);
}

/**
 * Formats and prints owner action status text with timestamp and optional transaction result details.
 *
 * @param {string} message Base owner action message.
 * @param {ContractCallResult} [result] Optional contract call result to include in the formatted output.
 * @returns {void} No return value.
 */
export function printOwnerActionResult(message: string, result?: ContractCallResult): void {
	const formattedText: string = formatOwnerActionResult(message, result);
	console.log(formattedText);
}

async function executeOwnerAction(
    functionName: OwnerActionFunctionName,
    args: readonly unknown[],
): Promise<ContractCallResult> {
	const walletClient: WalletClient<Transport, Chain> = createContractWalletClient(USING_CHAIN_CONFIG.chain);
	const publicClient: PublicClient<Transport, Chain> = createContractPublicClient(USING_CHAIN_CONFIG.chain);
	const account: Address = await getConnectedAccount();

	const transactionHash: Hash = await walletClient.writeContract({
		account,
		address: CONTRACT_ADDRESS as Address,
		abi: SIMPLE_TEXAS_HOLDEM_ABI,
		functionName,
		args,
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

export async function startGameApi(duration: bigint): Promise<ContractCallResult> {
	return executeOwnerAction("startGame", [duration]);
}

export async function endGameApi(): Promise<ContractCallResult> {
	return executeOwnerAction("endGame", []);
}

export async function withdrawHouseFeesApi(): Promise<ContractCallResult> {
	return executeOwnerAction("withdrawHouseFees", []);
}