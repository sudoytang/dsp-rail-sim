import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

export function Modal({ title, onClose, children, wide = false, eyebrow = "SYSTEM EDITOR" }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean; eyebrow?: string }) {
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="modal-close" onClick={onClose} aria-label="Close dialog">×</button></div>
        {children}
      </section>
    </div>,
    document.body,
  );
}
