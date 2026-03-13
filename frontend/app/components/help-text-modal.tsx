import { HelpCircle } from "@untitledui/icons";
import { Button } from "../../src/components/base/buttons/button";
import type { ReactNode } from "react";
import { TextDisplayModal } from "./text-display-modal";

type HelpTextModalProps = {
    text: string;
    title?: string;
};

/**
 * Help modal trigger and content component.
 *
 * Renders a help icon button that opens a modal containing game rules text.
 *
 * @param {HelpTextModalProps} props - Modal content props.
 * @param {string} props.text - Help text body shown inside the modal.
 * @param {string} [props.title] - Optional modal title.
 * @returns {ReactNode} A trigger button with attached modal dialog.
 */
export function HelpTextModal({ text, title = "Rules" }: HelpTextModalProps): ReactNode {
    return (
        <TextDisplayModal
            title={title}
            text={text}
            trigger={(

                /* Button opens the shared text modal with rules content. */
                <Button
                    color="link-gray"
                    iconLeading={<HelpCircle data-icon style={{ width: "24px", height: "24px" }} />}
                    aria-label="Open help modal"
                />

            )}
        />
    );
}