import { useEffect, useState } from "react";
import { isOwnerConnected } from "../utils/contractUtils";

interface EthereumProviderWithEvents {
    on: (event: "accountsChanged", handler: (accounts: string[]) => void) => void;
    removeListener: (event: "accountsChanged", handler: (accounts: string[]) => void) => void;
}

interface WindowWithEthereumEvents extends Window {
    ethereum?: EthereumProviderWithEvents;
}

interface UseIsOwnerResult {
    isOwner: boolean;
    isCheckingWalletOwnership: boolean;
}

export function useIsOwner(): UseIsOwnerResult {
    const [isOwner, setIsOwner] = useState<boolean>(false);
    const [isCheckingWalletOwnership, setIsCheckingWalletOwnership] = useState<boolean>(true);

    useEffect((): (() => void) => {
        console.debug("useIsOwner: useEffect() called");
        const checkOwnerStatus = async (): Promise<void> => {
            setIsCheckingWalletOwnership(true);

            try {
                const connectedAsOwner: boolean = await isOwnerConnected();
                setIsOwner(connectedAsOwner);
            } catch {
                setIsOwner(false);
            } finally {
                setIsCheckingWalletOwnership(false);
            }
        };

        void checkOwnerStatus();

        const { ethereum } = window as WindowWithEthereumEvents;

        const handleAccountsChanged = (): void => {
            void checkOwnerStatus();
        };

        if (ethereum !== undefined) {
            ethereum.on("accountsChanged", handleAccountsChanged);
        }

        return (): void => {
            if (ethereum !== undefined) {
                ethereum.removeListener("accountsChanged", handleAccountsChanged);
            }
        };
    }, []);

    return { isOwner, isCheckingWalletOwnership };
}
