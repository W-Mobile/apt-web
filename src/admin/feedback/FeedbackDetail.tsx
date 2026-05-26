import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getFeedback,
  updateFeedback,
  getUserByOwnerSub,
  AdminUser,
  Feedback,
  FeedbackCategory,
} from './feedback-api';

const categoryStyles: Record<FeedbackCategory, { text: string; bg: string; border: string; dot: string; label: string }> = {
  BUG: { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', dot: 'bg-red-400', label: 'Bug' },
  SUGGESTION: { text: 'text-amber-300', bg: 'bg-amber-300/10', border: 'border-amber-300/20', dot: 'bg-amber-300', label: 'Suggestion' },
  PRAISE: { text: 'text-pink-300', bg: 'bg-pink-300/10', border: 'border-pink-300/20', dot: 'bg-pink-300', label: 'Praise' },
  OTHER: { text: 'text-stone-300', bg: 'bg-stone-700/50', border: 'border-stone-600/30', dot: 'bg-stone-400', label: 'Other' },
};

function CategoryBadge({ category }: { category: FeedbackCategory }) {
  const s = categoryStyles[category];
  return (
    <span className={`inline-flex items-center gap-1.5 ${s.text} ${s.bg} border ${s.border} rounded-full px-2.5 py-0.5 text-xs font-medium`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function StatusBadge({ feedback }: { feedback: Feedback }) {
  if (feedback.isResolved) {
    return (
      <span className="inline-flex items-center gap-1.5 text-stone-400 bg-stone-700/50 border border-stone-600/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
        Åtgärdad
      </span>
    );
  }
  if (feedback.isRead) {
    return (
      <span className="inline-flex items-center gap-1.5 text-stone-400 bg-stone-700/50 border border-stone-600/30 rounded-full px-2.5 py-0.5 text-xs font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
        Läst
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2.5 py-0.5 text-xs font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      Ny
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('sv-SE')} ${d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
}

export function FeedbackDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getFeedback(id).then(async (data) => {
      setFeedback(data);
      setLoading(false);
      if (data) {
        getUserByOwnerSub(data.userId).then(setUser).catch(() => setUser(null));
        if (!data.isRead) {
          try {
            const updated = await updateFeedback({ id: data.id, isRead: true });
            setFeedback(updated);
          } catch {
            // Silent fail — UI still shows the feedback, admin can manually toggle later
          }
        }
      }
    });
  }, [id]);

  async function toggleRead() {
    if (!feedback || saving) return;
    setSaving(true);
    try {
      const updated = await updateFeedback({ id: feedback.id, isRead: !feedback.isRead });
      setFeedback(updated);
    } finally {
      setSaving(false);
    }
  }

  async function toggleResolved() {
    if (!feedback || saving) return;
    setSaving(true);
    try {
      const updated = await updateFeedback({ id: feedback.id, isResolved: !feedback.isResolved });
      setFeedback(updated);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-stone-400">Laddar feedback...</p>;
  if (!feedback) {
    return (
      <div className="space-y-3">
        <button onClick={() => navigate('/admin/feedback')} className="text-xs text-stone-500 hover:text-stone-300">
          ← Tillbaka till inkorg
        </button>
        <p className="text-stone-400">Feedback hittades inte.</p>
      </div>
    );
  }

  const shortId = feedback.id.slice(0, 8);

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/admin/feedback')}
        className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
      >
        ← Tillbaka till inkorg
      </button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#F24E1E] mb-1.5 font-medium">
            Feedback · {shortId}
          </div>
          <h2 className="text-2xl font-bold">
            {categoryStyles[feedback.category].label}-feedback från {user?.email ?? `${feedback.userId.slice(0, 8)}…`}
          </h2>
          <div className="w-12 h-0.5 bg-[#F24E1E] mt-3 rounded-full" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleRead}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl border border-stone-700 text-stone-300 text-sm hover:bg-stone-800 disabled:opacity-50 transition-colors"
          >
            {feedback.isRead ? 'Markera som oläst' : 'Markera som läst'}
          </button>
          <button
            onClick={toggleResolved}
            disabled={saving}
            className="px-3 py-1.5 rounded-xl bg-[#F24E1E] text-white text-sm font-medium hover:bg-[#d93d0f] disabled:opacity-50 transition-colors"
          >
            {feedback.isResolved ? 'Markera som oåtgärdad' : 'Markera åtgärdad'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="rounded-2xl border border-stone-800 bg-stone-900 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CategoryBadge category={feedback.category} />
              <StatusBadge feedback={feedback} />
            </div>
            <div className="text-stone-100 leading-relaxed text-[15px] whitespace-pre-wrap">
              {feedback.message?.trim() || (
                <span className="text-stone-600 italic">— Användaren skickade ingen text —</span>
              )}
            </div>
            <div className="mt-5 pt-5 border-t border-stone-800/70 flex items-center justify-between text-xs text-stone-500">
              <span>Skickat {formatDate(feedback.createdAt)}</span>
              <span>{feedback.message?.length ?? 0} tecken</span>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-stone-800 bg-stone-900 p-5 self-start">
          <div className="text-[10px] uppercase tracking-widest text-stone-500 mb-4 font-medium">
            Metadata
          </div>
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">E-post</dt>
              <dd className="text-stone-200 text-right break-all">
                {user?.email ?? <span className="text-stone-500 italic">— okänd —</span>}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Användar-ID</dt>
              <dd className="text-stone-200 font-mono text-[10px] text-right break-all">{feedback.userId}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">App-version</dt>
              <dd className="text-stone-200">{feedback.appVersion}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Plattform</dt>
              <dd className="text-stone-200">{feedback.platform}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Enhet</dt>
              <dd className="text-stone-200 text-right">{feedback.deviceModel}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">OS</dt>
              <dd className="text-stone-200">{feedback.osVersion}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Skickat</dt>
              <dd className="text-stone-200">{formatDate(feedback.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-stone-500">Uppdaterat</dt>
              <dd className="text-stone-200">{formatDate(feedback.updatedAt)}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
