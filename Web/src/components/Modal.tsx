import { useI18n } from '../i18n';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
let id = 0;
export default function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);
  const heading = useRef('dialog-' + ++id);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const cancel = (event: Event) => {
      event.preventDefault();
      closeRef.current?.();
    };
    dialog.addEventListener('cancel', cancel);
    return () => {
      dialog.removeEventListener('cancel', cancel);
      dialog.close();
      previous?.focus?.();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={heading.current}
      className={'modal ' + (wide ? 'wide ' : '') + className}
    >
      <div className="modal-title">
        <h2 id={heading.current}>{title}</h2>
        {onClose && (
          <button className="icon-button" aria-label={t('common.close')} onClick={onClose}>
            ×
          </button>
        )}
      </div>
      {children}
    </dialog>
  );
}
