import type { ComponentType, ReactNode, SVGProps } from "react";

type IconLinkProps = {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    url: string;
    ariaLabel: string;
};

/**
 * Reusable external icon link component.
 *
 * Renders an icon-only anchor element that opens a URL in a new tab.
 *
 * @param {IconLinkProps} props - Link configuration props.
 * @param {ComponentType<SVGProps<SVGSVGElement>>} props.icon - Icon component to render.
 * @param {string} props.url - Destination URL.
 * @param {string} props.ariaLabel - Accessible label for screen readers.
 * @returns {ReactNode} A styled icon link element.
 */
export function IconLink({ icon: Icon, url, ariaLabel }: IconLinkProps): ReactNode {
    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={ariaLabel}
            className="text-gray-900 transition duration-100 ease-linear hover:text-gray-600 dark:text-gray-100 dark:hover:text-gray-300"
        >
            <Icon style={{ width: "24px", height: "24px" }} />
        </a>
    );
}