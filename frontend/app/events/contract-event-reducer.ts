import type { PlayerInfoListItem } from "../components/player-info-list";
import { GameEndedResult, ParsedSimpleTexasHoldemEvent } from "./contract-event-parser";
import { evaluateHandRank } from "../utils/utils";


export interface GameEventState {
    isGameStarted: boolean;
    playerInfoItems: PlayerInfoListItem[];
    boardCards: readonly [number, number, number, number, number] | null;
    gameResult: GameEndedResult | null;
    houseFeeWithdrawnAmount: bigint | null;
}


export function gameEventReducer(gameEventState: GameEventState, contractEvent: ParsedSimpleTexasHoldemEvent): GameEventState {
    switch (contractEvent.eventName) {
        case "PlayerJoined": {
            const isAlreadyInList: boolean = gameEventState.playerInfoItems.some(
                (item: PlayerInfoListItem): boolean => item.player === contractEvent.player,
            );

            if (isAlreadyInList) {
                return gameEventState;
            }

            return {
                ...gameEventState,
                playerInfoItems: [
                    ...gameEventState.playerInfoItems,
                    {
                        player: contractEvent.player,
                        holeCards: [contractEvent.holeCards[0], contractEvent.holeCards[1]],
                        betAmount: BigInt(0),
                        handRank: 0,
                    },
                ],
            };
        }

        case "PlayerFolded": {
            const isInList: boolean = gameEventState.playerInfoItems.some(
                (item: PlayerInfoListItem): boolean => item.player === contractEvent.player,
            );

            if (!isInList) {
                return gameEventState;
            }

            return {
                ...gameEventState,
                playerInfoItems: gameEventState.playerInfoItems.filter(
                    (item: PlayerInfoListItem): boolean => item.player !== contractEvent.player,
                ),
            };
        }

        case "PlayerBet": {
            const isInList: boolean = gameEventState.playerInfoItems.some(
                (item: PlayerInfoListItem): boolean => item.player === contractEvent.player,
            );

            if (!isInList) {
                console.error(
                    "gameEventReducer PlayerBet event received but player is not in playerInfoItems.",
                    { player: contractEvent.player },
                );
                return gameEventState;
            }

            return {
                ...gameEventState,
                playerInfoItems: gameEventState.playerInfoItems.map(
                    (item: PlayerInfoListItem): PlayerInfoListItem =>
                        item.player === contractEvent.player
                            ? { ...item, betAmount: contractEvent.amount }
                            : item,
                ),
            };
        }

        case "BoardCardsDealt": {
            const updatedPlayerInfoItems: PlayerInfoListItem[] = gameEventState.playerInfoItems.map(
                (item: PlayerInfoListItem): PlayerInfoListItem => {
                    const handRank: number = evaluateHandRank(
                        item.holeCards,
                        contractEvent.boardCards,
                    );

                    return {
                        ...item,
                        handRank,
                    };
                },
            );

            return {
                ...gameEventState,
                playerInfoItems: updatedPlayerInfoItems,
                boardCards: contractEvent.boardCards,
            };
        }

        case "GameEnded": {
            return {
                ...gameEventState,
                isGameStarted: false,
                gameResult: contractEvent.result,
            };
        }

        case "HouseFeeWithdrawn": {
            return {
                ...gameEventState,
                houseFeeWithdrawnAmount: contractEvent.amount,
            };
        }

        case "GameStarted": {
            return {
                isGameStarted: true,
                playerInfoItems: [],
                boardCards: null,
                gameResult: null,
                houseFeeWithdrawnAmount: null,
            };
        }

        default: {
            console.error('gameEventReducer received unknown event: ' + contractEvent);
            return gameEventState;
        }
    }
}
