import type { ComponentType, SVGProps } from "react";

type IconLinkProps = {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  url: string;
  ariaLabel: string;
};

export function IconLink({ icon: Icon, url, ariaLabel }: IconLinkProps) {
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