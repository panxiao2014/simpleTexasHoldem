import { HelpCircle } from "@untitledui/icons";
import { Button } from "../../src/components/base/buttons/button";
import { CloseButton } from "../../src/components/base/buttons/close-button";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "../../src/components/application/modals/modal";

type HelpTextModalProps = {
  text: string;
  title?: string;
};

export function HelpTextModal({ text, title = "Rules" }: HelpTextModalProps) {
  return (
    <DialogTrigger>
      <Button
        color="link-gray"
        iconLeading={<HelpCircle data-icon style={{ width: "24px", height: "24px" }} />}
        aria-label="Open help modal"
      />

      <ModalOverlay isDismissable>
        <Modal>
          <Dialog>
            {({ close }) => (
              <div className="w-full max-w-3xl rounded-xl border border-secondary bg-primary shadow-xl">
                <div className="flex items-center justify-between border-b border-secondary px-5 py-4">
                  <h2 className="text-lg font-semibold text-primary">{title}</h2>
                  <CloseButton onPress={close} />
                </div>

                <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
                  <pre className="whitespace-pre-wrap text-sm leading-6 text-tertiary">{text}</pre>
                </div>

                <div className="flex justify-end border-t border-secondary px-5 py-4">
                  <Button color="secondary" onPress={close}>
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