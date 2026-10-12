import { X } from 'lucide-react';
import type { ActionNotice } from './useMemberActions';

export function ActionNoticeBar({ notice, onClose }: { notice: ActionNotice | null; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div
      role="status"
      className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
        notice.kind === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-200' : 'border-stone-700 bg-stone-800/60 text-stone-200'
      }`}
    >
      {notice.text}
      <button type="button" aria-label="Stäng meddelande" onClick={onClose} className="opacity-60 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
