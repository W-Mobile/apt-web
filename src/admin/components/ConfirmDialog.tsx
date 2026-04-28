interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel, confirmLabel = 'Ja, ta bort', cancelLabel = 'Avbryt' }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-stone-900 rounded-2xl p-6 max-w-sm w-full border border-stone-700">
        <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
        {message && <p className="text-stone-400 text-sm mb-4">{message}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-stone-300 hover:text-white rounded-xl transition-colors">{cancelLabel}</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
