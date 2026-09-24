'use client';

import { FileUp, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Select, Textarea } from '@/components/ui/field';
import { Notice } from '@/components/ui/notice';
import { plural } from '@/lib/format';
import {
  buildVoters,
  guessRoles,
  parseFile,
  parseText,
  requiredRoles,
  ROLE_LABEL,
  type ColumnRole,
  type ImportResult,
  type Table,
} from '@/lib/voter-import';
import { formatPhone } from '@/lib/voting/normalize';
import type { VoterMethod } from '@/lib/voting/types';

const HINTS: Record<VoterMethod, string> = {
  email: 'One email per line, or paste columns straight from Excel or Google Sheets. Names are optional but help you find people later.',
  phone: 'One phone number per line, like 024 412 3456, or paste columns from a spreadsheet. Names are optional.',
  member_id: 'Include each person’s ID number and an email or phone number. We send their sign-in code there.',
  code: 'One name per line. We’ll make a private voting code for each person.',
};

const PLACEHOLDER: Record<VoterMethod, string> = {
  email: 'ama.mensah@st.ug.edu.gh\nkofi.boateng@st.ug.edu.gh',
  phone: 'Ama Mensah, 024 412 3456\nKofi Boateng, 055 123 4567',
  member_id: 'Index number, Name, Email\n10293847, Ama Mensah, ama@st.ug.edu.gh',
  code: 'Ama Mensah\nKofi Boateng\nEfua Owusu',
};

export function VoterImport({ method, onChange }: { method: VoterMethod; onChange: (result: ImportResult | null) => void }) {
  const id = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [table, setTable] = useState<Table | null>(null);
  const [roles, setRoles] = useState<ColumnRole[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const result = useMemo(() => (table ? buildVoters(table, roles, method) : null), [table, roles, method]);
  const missing = requiredRoles(method).filter((r) => !roles.includes(r));

  useEffect(() => {
    onChange(result && result.voters.length && !missing.length ? result : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onChange is a setter from the parent
  }, [result, missing.length]);

  function load(next: Table) {
    setTable(next.rows.length ? next : null);
    setRoles(guessRoles(next, method));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const parsed = await parseFile(file);
      if (!parsed.rows.length) throw new Error('That file looks empty.');
      setFileName(file.name);
      setText('');
      load(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We could not read that file.');
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    onFile(e.dataTransfer.files[0]);
  }

  function clear() {
    setText('');
    setTable(null);
    setRoles([]);
    setFileName(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  const width = roles.length;
  const preview = table?.rows.slice(0, 5) ?? [];

  return (
    <div className="grid gap-4">
      {!fileName && (
        <div
          className={`grid gap-2 rounded-lg ${dragging ? 'ring-2 ring-accent' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <label htmlFor={`${id}-paste`} className="text-sm font-semibold">
            Paste your list
          </label>
          <p className="-mt-1 text-sm text-ink-2">{HINTS[method]}</p>
          <Textarea
            id={`${id}-paste`}
            rows={7}
            value={text}
            placeholder={PLACEHOLDER[method]}
            onChange={(e) => {
              setText(e.target.value);
              load(parseText(e.target.value));
            }}
            className="font-mono text-sm"
            spellCheck={false}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          id={`${id}-file`}
          type="file"
          accept=".csv,.txt,.tsv,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {fileName ? (
          <span className="inline-flex items-center gap-2 rounded-md bg-sunk px-3 py-2 text-sm font-semibold">
            <FileUp className="size-4 text-ink-2" aria-hidden="true" /> {fileName}
          </span>
        ) : (
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <FileUp className="size-4" aria-hidden="true" /> Upload a file instead
          </Button>
        )}
        {(fileName || text) && (
          <Button variant="ghost" onClick={clear}>
            <X className="size-4" aria-hidden="true" /> Start over
          </Button>
        )}
        {!fileName && <span className="text-sm text-ink-3">Excel (.xlsx), CSV or text files</span>}
      </div>

      {error && <Notice tone="danger">{error}</Notice>}

      {table && (
        <div className="grid gap-3">
          <p className="text-sm font-semibold">Check each column</p>
          <div className="overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-sunk">
                <tr>
                  {Array.from({ length: width }, (_, i) => (
                    <th key={i} className="p-2 text-left align-bottom font-normal">
                      {table.headers?.[i] && <span className="mb-1 block text-xs text-ink-3">{table.headers[i]}</span>}
                      <Select
                        aria-label={`What is in column ${i + 1}?`}
                        value={roles[i]}
                        onChange={(e) => setRoles((prev) => prev.map((r, j) => (j === i ? (e.target.value as ColumnRole) : r)))}
                        className="!h-9 min-w-36 text-sm"
                      >
                        {(Object.keys(ROLE_LABEL) as ColumnRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABEL[role]}
                          </option>
                        ))}
                      </Select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.map((row, r) => (
                  <tr key={r}>
                    {Array.from({ length: width }, (_, i) => (
                      <td key={i} className={`max-w-56 truncate px-3 py-2 ${roles[i] === 'ignore' ? 'text-ink-3 line-through' : ''}`}>
                        {row[i] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {table.rows.length > preview.length && (
            <p className="text-xs text-ink-3">Showing the first {preview.length} of {plural(table.rows.length, 'row')}.</p>
          )}

          {missing.length > 0 ? (
            <Notice tone="warn">
              Tell us which column has the {missing.map((m) => ROLE_LABEL[m].toLowerCase()).join(' and ')}.
            </Notice>
          ) : result && result.voters.length > 0 ? (
            <Notice tone="success" title={`${plural(result.voters.length, 'voter')} ready to add`}>
              {result.duplicates > 0 && <p>{plural(result.duplicates, 'repeat')} removed.</p>}
              {result.skipped.length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer font-semibold text-ink">
                    {plural(result.skipped.length, 'row')} skipped. See why
                  </summary>
                  <ul className="mt-2 grid gap-0.5">
                    {result.skipped.slice(0, 25).map((s) => (
                      <li key={s.row}>
                        Row {s.row}: {s.reason}
                      </li>
                    ))}
                    {result.skipped.length > 25 && <li>…and {result.skipped.length - 25} more</li>}
                  </ul>
                </details>
              )}
              {method === 'phone' && result.voters[0]?.phone && (
                <p className="mt-1">Numbers are saved like {formatPhone(result.voters[0].phone)}.</p>
              )}
            </Notice>
          ) : (
            <Notice tone="warn">None of these rows can be used yet. Check the columns above.</Notice>
          )}
        </div>
      )}
    </div>
  );
}
