import { ReactNode, useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, MoreHorizontal, X } from 'lucide-react';
import type { ClubMember, ClubRole, DraftCheck, MemberStatus } from './club-api';
import { checkLabel, initials } from './club-utils';

// Small building blocks shared by the Clubs pages. Styled after the existing
// admin pills (PublishBadge), segmented control (CategorySelect) and modals
// (CategoryFormModal).

const PILL = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border whitespace-nowrap';

const STATUS_STYLES: Record<MemberStatus, { label: string; className: string; dot: string }> = {
  DRAFT: { label: 'Utkast', className: 'text-stone-300 bg-stone-800 border-stone-700', dot: 'bg-stone-400' },
  INVITED: { label: 'Inbjuden', className: 'text-amber-300 bg-amber-300/10 border-amber-300/20', dot: 'bg-amber-300' },
  JOINED: { label: 'Ansluten', className: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', dot: 'bg-emerald-400' },
  DECLINED: { label: 'Tackat nej', className: 'text-red-300 bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
  REMOVED: { label: 'Borttagen', className: 'text-stone-500 bg-stone-900 border-stone-800', dot: 'bg-stone-600' },
};

export function StatusPill({ status }: { status: MemberStatus | null }) {
  const style = STATUS_STYLES[status ?? 'DRAFT'];
  return (
    <span className={`${PILL} ${style.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function NoCoachPill() {
  return <span className={`${PILL} text-red-300 bg-red-500/10 border-red-500/20`}>Ingen klubbcoach</span>;
}

export function RolePill({ role }: { role: ClubRole | null }) {
  return (
    <span className="inline-flex rounded-md bg-stone-800 border border-stone-700 px-2 py-0.5 text-xs text-stone-300">
      {role === 'COACH' ? 'Klubbcoach' : 'Spelare'}
    </span>
  );
}

/** The "Kontroll" cell of a draft row: Redo, or the first error/info. */
export function CheckCell({ checks }: { checks: DraftCheck[] | undefined }) {
  const errors = (checks ?? []).filter((c) => c.severity === 'error');
  const infos = (checks ?? []).filter((c) => c.severity === 'info');
  if (errors.length) {
    const labels = [...new Set(errors.map((c) => checkLabel(c.code)))];
    return (
      <span className="inline-flex items-start gap-1.5 text-xs text-red-400" title={labels.join(' · ')}>
        <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" />
        {labels[0]}
        {labels.length > 1 && <span className="text-red-400/70">+{labels.length - 1}</span>}
      </span>
    );
  }
  return (
    <span className="flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />Redo
      </span>
      {infos.map((c) => (
        <span key={c.code} className="inline-flex items-start gap-1.5 text-xs text-stone-400">
          <Info className="w-3.5 h-3.5 mt-px shrink-0" />{checkLabel(c.code)}
        </span>
      ))}
    </span>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex bg-stone-950 border border-stone-800 rounded-xl p-1 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={opt.value === value}
          onClick={() => onChange(opt.value)}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            opt.value === value ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-white'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function FilterPills<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs uppercase tracking-wider text-stone-500 mr-1 w-24">{label}</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-xs rounded-full transition-colors ${
            value === opt.value ? 'bg-[#F24E1E] text-white' : 'bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ value, label, warning }: { value: ReactNode; label: string; warning?: boolean }) {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/60 px-4 py-3">
      <div className={`text-2xl font-bold tabular-nums ${warning ? 'text-amber-300' : 'text-white'}`}>{value}</div>
      <div className="text-xs uppercase tracking-wider text-stone-500 mt-0.5">{label}</div>
    </div>
  );
}

export function MemberAvatar({ member, size = 'md' }: { member: ClubMember; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-[11px]', md: 'w-9 h-9 text-xs', lg: 'w-14 h-14 text-lg' };
  return (
    <span className={`${sizes[size]} rounded-full bg-[#F24E1E] text-white font-bold flex items-center justify-center shrink-0`}>
      {initials(member)}
    </span>
  );
}

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = 'max-w-md',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`bg-stone-900 rounded-2xl p-6 w-full ${width} border border-stone-700 max-h-full overflow-auto`}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Stäng" className="text-stone-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
        <div className="flex justify-end gap-3 mt-6">{footer}</div>
      </div>
    </div>
  );
}

export const inputClass =
  'w-full px-3 py-2 bg-stone-800 text-white rounded-xl border border-stone-700 focus:border-[#F24E1E] focus:outline-none transition-colors text-sm [color-scheme:dark]';

export const primaryButton =
  'px-4 py-2 text-sm bg-[#F24E1E] text-white font-medium rounded-xl hover:bg-[#d93d0f] disabled:opacity-50 transition-colors';

export const secondaryButton =
  'px-4 py-2 text-sm text-stone-300 bg-stone-800 border border-stone-700 rounded-xl hover:bg-stone-700 disabled:opacity-50 transition-colors';

export interface RowMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** "…" button with a dropdown of row actions. Closes on outside click. */
export function RowMenu({ items, label = 'Åtgärder' }: { items: RowMenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const visible = items.filter((i) => !i.hidden);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-stone-700 bg-stone-900 shadow-xl py-1">
          {visible.map((item, i) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left hover:bg-stone-800 ${
                item.danger ? `text-red-400 ${i > 0 ? 'border-t border-stone-800' : ''}` : 'text-stone-200'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
