import { useEffect, useState, type ReactNode } from "react";
import * as Cards from "@letele/playing-cards";
import { formatEther, type Address } from "viem";
import { getConnectedAccount } from "../api/ether-api";
import { formatHandRankLabel, getCardComponentKeyFromIndex } from "../utils/utils";

export interface PlayerInfoListItem {
    player: string;
    holeCards: readonly [number, number];
    betAmount: bigint;
    handRank: number;
    isFolded: boolean;
}

interface PlayerInfoListProps {
    items: PlayerInfoListItem[];
}

interface EthereumAccountsProvider {
    on: (eventName: "accountsChanged", listener: (accounts: string[]) => void) => void;
    removeListener: (eventName: "accountsChanged", listener: (accounts: string[]) => void) => void;
}

interface WindowWithEthereumProvider extends Window {
    ethereum?: EthereumAccountsProvider;
}

export function PlayerInfoList({ items }: PlayerInfoListProps): ReactNode {
    const [connectedAccount, setConnectedAccount] = useState<Address | null>(null);

    useEffect(() => {
        let isMounted = true;

        const { ethereum }: WindowWithEthereumProvider = window as WindowWithEthereumProvider;

        const handleAccountsChanged = (accounts: string[]) => {
            if (!isMounted) return;

            const nextAccount =
                accounts.length > 0 ? (accounts[0] as Address) : null;

            setConnectedAccount(nextAccount);
        };

        const loadConnectedAccount = async () => {
            try {
                const account = await getConnectedAccount();
                if (isMounted) setConnectedAccount(account);
            } catch (error) {
                console.error("Failed to load connected account.", error);
            }
        };

        if (ethereum) {
            ethereum.on("accountsChanged", handleAccountsChanged);
        }

        void loadConnectedAccount();

        return () => {
            if (ethereum) {
                ethereum.removeListener("accountsChanged", handleAccountsChanged);
            }
            isMounted = false;
        };
    }, []);

    /**
     * ✅ Percentage-based layout (stable & aligned)
     */
    const gridCols =
        "grid-cols-[35%_20%_10%_15%_20%]";

    return (
        <section className="rounded-lg border border-amber-700/50 bg-gradient-to-br from-green-900 to-green-950 p-4 shadow-lg">
            <h3 className="mb-2 text-sm font-semibold text-amber-400">Players In Game</h3>

            {/* Header */}
            <div className={`grid ${gridCols} gap-2 border-b border-amber-700/50 pb-2 text-xs font-medium text-amber-400`}>
                <span>Player</span>
                <span className="text-center">Hole Cards</span>
                <span>Folded</span>
                <span>Bet Amount</span>
                <span>Hand Rank</span>
            </div>

            <div className="pt-3 text-xs text-amber-300">
                {items.map((item) => {
                    const firstCardKey = getCardComponentKeyFromIndex(Number(item.holeCards[0]));
                    const secondCardKey = getCardComponentKeyFromIndex(Number(item.holeCards[1]));

                    const FirstCardComponent = Cards[firstCardKey as keyof typeof Cards];
                    const SecondCardComponent = Cards[secondCardKey as keyof typeof Cards];

                    const isCurrentConnectedAccount =
                        connectedAccount &&
                        item.player.toLowerCase() === connectedAccount.toLowerCase();

                    const playerLabel = isCurrentConnectedAccount
                        ? "Myself"
                        : item.player;

                    let rowClassName = isCurrentConnectedAccount
                        ? `grid ${gridCols} items-center gap-2 rounded-md bg-amber-500/20 px-2 py-1 font-medium text-amber-200`
                        : `grid ${gridCols} items-center gap-2 py-1`;

                    if (item.isFolded) {
                        rowClassName += " opacity-40 grayscale-[0.3]";
                    }

                    return (
                        <div key={item.player} className={rowClassName}>
                            {/* Player */}
                            <span className="break-all pr-2">
                                {playerLabel}
                            </span>

                            {/* Hole Cards */}
                            <div className="flex justify-center gap-2">
                                {FirstCardComponent ? (
                                    <div className="aspect-[5/7] w-12 shrink-0 sm:w-14">
                                        <FirstCardComponent className="h-full w-full" />
                                    </div>
                                ) : (
                                    <span className="text-amber-300">{item.holeCards[0]}</span>
                                )}

                                {SecondCardComponent ? (
                                    <div className="aspect-[5/7] w-12 shrink-0 sm:w-14">
                                        <SecondCardComponent className="h-full w-full" />
                                    </div>
                                ) : (
                                    <span className="text-amber-300">{item.holeCards[1]}</span>
                                )}
                            </div>

                            {/* Folded */}
                            <span>{item.isFolded ? "Yes" : "No"}</span>

                            {/* Bet */}
                            <span className="whitespace-nowrap">
                                {formatEther(item.betAmount)} ETH
                            </span>

                            {/* Hand Rank */}
                            <span className="whitespace-pre-line break-words">
                                {formatHandRankLabel(item.handRank)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}