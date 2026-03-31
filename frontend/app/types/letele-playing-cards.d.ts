declare module "@letele/playing-cards" {
    import type { ComponentType, SVGProps } from "react";

    export type PlayingCardProps = SVGProps<SVGSVGElement> & {
        width?: number | string;
        height?: number | string;
    };

    const cards: Record<string, ComponentType<PlayingCardProps>>;

    export = cards;
}
