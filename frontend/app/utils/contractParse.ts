import { formatEther } from "viem";

export interface CurrentGameInfo {
    gameId: bigint;
    startTime: bigint;
    endTime: bigint;
    playerCount: bigint;
    totalParticipations: bigint;
    cardsRemaining: bigint;
    gameActive: boolean;
}

export function formatCurrentGameInfoText(currentInfo: CurrentGameInfo): string {
    return [
        `Game ID: ${currentInfo.gameId.toString()}`,
        `Start Time: ${currentInfo.startTime.toString()}`,
        `End Time: ${currentInfo.endTime.toString()}`,
        `Player Count: ${currentInfo.playerCount.toString()}`,
        `Total Participations: ${currentInfo.totalParticipations.toString()}`,
        `Cards Remaining: ${currentInfo.cardsRemaining.toString()}`,
        `Game Active: ${currentInfo.gameActive ? "Yes" : "No"}`,
    ].join("\n");
}

export function formatBalanceInfoText(address: string, balanceWei: bigint): string {
    const balanceEth: string = formatEther(balanceWei);
    return [
        `Address: ${address}`,
        `Balance (wei): ${balanceWei.toString()}`,
        `Balance (ETH): ${balanceEth}`,
    ].join("\n");
}