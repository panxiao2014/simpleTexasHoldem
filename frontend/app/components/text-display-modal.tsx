import type { ReactNode } from "react";
import { Button } from "../../src/components/base/buttons/button";
import { CloseButton } from "../../src/components/base/buttons/close-button";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "../../src/components/application/modals/modal";

type TextDisplayModalProps = {
    title?: string;
    text: string;
    trigger: ReactNode;
};

/**
 * Reusable text modal component with a custom trigger element.
 *
 * Purpose:
 * Renders a shared modal UI used to display long-form text content for different actions.
 *
 * Props:
 * - `title` (string, optional): Header title shown at the top of the modal.
 * - `text` (string): Body text rendered inside a scrollable preformatted block.
 * - `trigger` (ReactNode): Trigger element that opens the modal (e.g., icon button, action button).
 *
 * Usage:
 * Use this component anywhere a trigger should open the same text-view modal layout with different content.
 *
 * @param {TextDisplayModalProps} props - Modal display and trigger props.
 * @returns {ReactNode} A trigger with attached reusable modal dialog.
 */
export function TextDisplayModal({ title = "Info", text, trigger }: TextDisplayModalProps): ReactNode {
    return (
        <DialogTrigger>

            {/* Trigger element opens the shared text modal dialog. */}
            {trigger}

            {/* ModalOverlay renders a dismissible backdrop for the text modal. */}
            <ModalOverlay isDismissable>
                <Modal>

                    {/* Dialog provides accessible modal structure and close handling. */}
                    <Dialog>
                        {({ close }) => (
                            <div className="w-full max-w-3xl rounded-xl border border-secondary bg-primary shadow-xl">
                                <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                                    <h2 className="text-lg font-semibold text-primary">{title}</h2>

                                    {/* CloseButton closes the modal from the header action. */}
                                    <CloseButton onPress={close} />
                                </div>

                                <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                                    <pre className="whitespace-pre-wrap text-sm leading-6 text-tertiary">{text}</pre>
                                </div>

                                <div className="flex justify-end border-t border-secondary px-5 py-4">

                                    {/* Footer button closes the text modal dialog. */}
                                    <Button color="secondary" onClick={close}>
                                        Close
                                    </Button>

                                </div>
                            </div>
                        )}
                    </Dialog>

                </Modal>
            </ModalOverlay>

        </DialogTrigger>
    );
}