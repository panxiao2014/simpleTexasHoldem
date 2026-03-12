import { useEffect, useState } from "react";
import { isOwnerConnected } from "../utils/utils";

interface EthereumProviderWithEvents {
    on: (event: "accountsChanged", handler: (accounts: string[]) => void) => void;
    removeListener: (event: "accountsChanged", handler: (accounts: string[]) => void) => void;
}

interface WindowWithEthereumEvents extends Window {
    ethereum?: EthereumProviderWithEvents;
}

interface UseIsOwnerResult {
    isOwner: boolean;
    isLoading: boolean;
}

export function useIsOwner(): UseIsOwnerResult {
    const [isOwner, setIsOwner] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect((): (() => void) => {
        const checkOwnerStatus = async (): Promise<void> => {
            setIsLoading(true);

            try {
                const connectedAsOwner: boolean = await isOwnerConnected();
                setIsOwner(connectedAsOwner);
            } catch {
                setIsOwner(false);
            } finally {
                setIsLoading(false);
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

    return { isOwner, isLoading };
}
