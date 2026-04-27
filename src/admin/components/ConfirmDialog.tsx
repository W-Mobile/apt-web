interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
        {message && <p className="text-gray-400 text-sm mb-4">{message}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-300 hover:text-white">Avbryt</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700">Ja, ta bort</button>
        </div>
      </div>
    </div>
  );
}
