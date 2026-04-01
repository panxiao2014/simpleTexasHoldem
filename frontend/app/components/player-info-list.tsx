import { useEffect, useState, type ReactNode } from "react";
import * as Cards from "@letele/playing-cards";
import { formatEther, type Address } from "viem";
import { getConnectedAccount } from "../api/ether-api";

export interface PlayerInfoListItem {
    player: string;
    holeCards: readonly [string, string];
    betAmount: bigint;
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

/**
 * PlayerInfoList component for displaying player status columns in owner view.
 *
 * Purpose:
 * Renders the "Players In Game" section with column headers for Player, Hole Cards, and Bet Amount.
 *
 * Props:
 * - items (PlayerInfoListItem[]): player rows to display.
 *
 * Usage:
 * Render this component where owner-facing player information should appear and pass player rows from contract events.
 *
 * @returns {ReactNode} The player info section with table headers and rows.
 */
export function PlayerInfoList({ items }: PlayerInfoListProps): ReactNode {
    const [connectedAccount, setConnectedAccount] = useState<Address | null>(null);

    useEffect((): (() => void) => {
        let isMounted: boolean = true;

        const { ethereum }: WindowWithEthereumProvider = window as WindowWithEthereumProvider;

        //handle user account changed in Metamask
        const handleAccountsChanged = (accounts: string[]): void => {
            if (!isMounted) {
                return;
            }

            const nextAccount: Address | null = accounts.length > 0 ? (accounts[0] as Address) : null;
            setConnectedAccount(nextAccount);
        };

        const loadConnectedAccount = async (): Promise<void> => {
            try {
                const account: Address = await getConnectedAccount();
                if (isMounted) {
                    setConnectedAccount(account);
                }
            } catch (error: unknown) {
                console.error("Failed to load connected account for player list.", error);
            }
        };

        if (ethereum !== undefined) {
            ethereum.on("accountsChanged", handleAccountsChanged);
        }

        void loadConnectedAccount();

        return (): void => {
            if (ethereum !== undefined) {
                ethereum.removeListener("accountsChanged", handleAccountsChanged);
            }
            isMounted = false;
        };
    }, []);

    return (

        <section
            className="rounded-lg border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-950/30"
            data-testid="player-info-list"
        >
            <h3 className="mb-2 text-sm font-semibold">Players In Game</h3>

            <div className="grid grid-cols-3 gap-2 border-b border-secondary pb-2 text-xs font-medium">
                <span>Player</span>
                <span>Hole Cards</span>
                <span>Bet Amount</span>
            </div>

            <div className="pt-3 text-xs text-muted-foreground" aria-live="polite">

                {items.map((item: PlayerInfoListItem): ReactNode => {
                    const FirstCardComponent = Cards[item.holeCards[0] as keyof typeof Cards];
                    const SecondCardComponent = Cards[item.holeCards[1] as keyof typeof Cards];
                    const isCurrentConnectedAccount: boolean = connectedAccount !== null
                        && item.player.toLowerCase() === connectedAccount.toLowerCase();
                    const playerLabel: string = isCurrentConnectedAccount ? "Myself" : item.player;
                    const rowClassName: string = isCurrentConnectedAccount
                        ? "grid grid-cols-3 gap-2 rounded-md bg-orange-200/70 px-2 py-1 font-medium text-orange-950 dark:bg-orange-900/40 dark:text-orange-100"
                        : "grid grid-cols-3 gap-2 py-1";

                    return (

                        <div key={item.player} className={rowClassName}>
                            <span className="break-all whitespace-normal">{playerLabel}</span>

                            <div className="flex gap-2">

                                {FirstCardComponent === undefined ? (
                                    <span>{item.holeCards[0]}</span>
                                ) : (

                                    <div className="aspect-[5/7] w-10">
                                        <FirstCardComponent className="h-full w-full" />
                                    </div>

                                )}

                                {SecondCardComponent === undefined ? (
                                    <span>{item.holeCards[1]}</span>
                                ) : (

                                    <div className="aspect-[5/7] w-10">
                                        <SecondCardComponent className="h-full w-full" />
                                    </div>

                                )}

                            </div>

                            <span>{formatEther(item.betAmount)} ETH</span>
                        </div>

                    );
                })}

            </div>
        </section>

    );
}