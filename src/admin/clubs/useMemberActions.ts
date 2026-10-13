import { useState } from 'react';
import type { OperationResult } from './club-api';
import { resultMessage } from './club-utils';

export interface ActionNotice {
  kind: 'info' | 'error';
  text: string;
}

/**
 * Runs a member action (resend, remove, change coach, …), reloads the club
 * and reports the outcome as a notice. Per-member failures in the backend's
 * OperationResult are shown too.
 */
export function useMemberActions(onChanged: () => Promise<void>) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<ActionNotice | null>(null);

  async function run(action: () => Promise<OperationResult | void>, successText: string) {
    setBusy(true);
    setNotice(null);
    try {
      const result = await action();
      const failed = result && result.results ? result.results.filter((r) => r.status === 'error' || r.status === 'email-failed') : [];
      if (failed.length) {
        setNotice({ kind: 'error', text: failed.map((r) => `${r.email ?? ''}: ${resultMessage(r.message) || 'misslyckades'}`).join(' · ') });
      } else {
        setNotice({ kind: 'info', text: successText });
      }
    } catch (err) {
      setNotice({ kind: 'error', text: resultMessage(err instanceof Error ? err.message : 'Okänt fel') });
    } finally {
      setBusy(false);
      await onChanged();
    }
  }

  return { busy, notice, setNotice, run };
}
