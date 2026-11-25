import type { ReactNode } from "react";
import { Modal } from "./Modal";

export function ConfirmDialog({ title, eyebrow, message, detail, confirmLabel = "Confirm", danger = false, onCancel, onConfirm }: {
  title: string;
  eyebrow?: string;
  message: ReactNode;
  detail?: string;
  confirmLabel?: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title={title} eyebrow={eyebrow} onClose={onCancel}>
      <div className="confirm-message">{message}</div>
      {detail && <p className="dialog-description">{detail}</p>}
      <p className="dialog-note">This action cannot be undone.</p>
      <div className="dialog-actions"><button className="button secondary" onClick={onCancel}>Cancel</button><button className={`button ${danger ? "danger-solid" : "primary"}`} onClick={onConfirm}>{confirmLabel}</button></div>
    </Modal>
  );
}
