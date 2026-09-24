'use client';

import { ArrowDown, ArrowUp, Camera, Plus, Trash2, X } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { emptyCandidate, newPosition, type DraftCandidate, type DraftPosition } from '@/lib/ballot-draft';

function PhotoPicker({ candidate, onChange }: { candidate: DraftCandidate; onChange: (c: Partial<DraftCandidate>) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const src = candidate.photoPreview || candidate.photo_url;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex size-16 items-center justify-center overflow-hidden rounded-md border border-dashed border-line-strong bg-paper text-ink-3 hover:border-accent hover:text-accent"
        aria-label={src ? `Change photo of ${candidate.name || 'candidate'}` : `Add a photo of ${candidate.name || 'candidate'}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview or resized upload */}
        {src ? <img src={src} alt="" className="size-full object-cover" /> : <Camera className="size-5" aria-hidden="true" />}
      </button>
      {src && (
        <button
          type="button"
          onClick={() => onChange({ photoFile: null, photoPreview: null, photo_url: null })}
          className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border border-line bg-card text-ink-2 hover:text-danger"
          aria-label="Remove photo"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange({ photoFile: file, photoPreview: URL.createObjectURL(file) });
          e.target.value = '';
        }}
      />
    </div>
  );
}

export function BallotEditor({ value, onChange }: { value: DraftPosition[]; onChange: (next: DraftPosition[]) => void }) {
  const update = (key: string, patch: Partial<DraftPosition>) =>
    onChange(value.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const updateCandidate = (pos: DraftPosition, key: string, patch: Partial<DraftCandidate>) =>
    update(pos.key, { candidates: pos.candidates.map((c) => (c.key === key ? { ...c, ...patch } : c)) });
  const move = (index: number, by: number) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };

  return (
    <div className="grid gap-5">
      {value.map((pos, index) => {
        const named = pos.candidates.filter((c) => c.name.trim()).length;
        return (
          <section key={pos.key} className="rounded-lg border border-line bg-card" aria-label={pos.title || `Position ${index + 1}`}>
            <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
              <label className="grid min-w-48 flex-1 gap-1">
                <span className="text-xs font-semibold text-ink-2">Position {index + 1}</span>
                <Input
                  value={pos.title}
                  onChange={(e) => update(pos.key, { title: e.target.value })}
                  placeholder="For example: President"
                  className="font-bold"
                  maxLength={120}
                />
              </label>
              <label className="grid w-28 gap-1">
                <span className="text-xs font-semibold text-ink-2">Winners</span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={pos.seats}
                  onChange={(e) => update(pos.key, { seats: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                  className="tabular"
                />
              </label>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="!h-11 !px-2.5" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                  <ArrowUp className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="!h-11 !px-2.5"
                  onClick={() => move(index, 1)}
                  disabled={index === value.length - 1}
                  aria-label="Move down"
                >
                  <ArrowDown className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="!h-11 !px-2.5 hover:!text-danger"
                  onClick={() => onChange(value.filter((p) => p.key !== pos.key))}
                  aria-label={`Remove ${pos.title || 'this position'}`}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <ul className="grid gap-3 p-4">
              {pos.candidates.map((c, ci) => (
                <li key={c.key} className="flex items-start gap-3">
                  <PhotoPicker candidate={c} onChange={(patch) => updateCandidate(pos, c.key, patch)} />
                  <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                    <Input
                      aria-label={`Candidate ${ci + 1} name`}
                      value={c.name}
                      onChange={(e) => updateCandidate(pos, c.key, { name: e.target.value })}
                      placeholder="Full name"
                      maxLength={120}
                    />
                    <Input
                      aria-label={`Candidate ${ci + 1} short note`}
                      value={c.bio}
                      onChange={(e) => updateCandidate(pos, c.key, { bio: e.target.value })}
                      placeholder="Short note, like “Level 300, Computer Science”"
                      maxLength={600}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="!h-11 !px-2.5 hover:!text-danger"
                    onClick={() => update(pos.key, { candidates: pos.candidates.filter((x) => x.key !== c.key) })}
                    aria-label={`Remove ${c.name || `candidate ${ci + 1}`}`}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </li>
              ))}
              <li className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" onClick={() => update(pos.key, { candidates: [...pos.candidates, emptyCandidate()] })}>
                  <Plus className="size-4" aria-hidden="true" /> Add candidate
                </Button>
                {named === 1 && <span className="text-sm text-ink-2">Only one candidate: voters will choose Yes or No.</span>}
                {pos.seats > 1 && named > 1 && named <= pos.seats && (
                  <span className="text-sm text-warn">
                    {pos.seats} winners but only {named} {named === 1 ? 'candidate' : 'candidates'}.
                  </span>
                )}
                {pos.seats > 1 && named > pos.seats && (
                  <span className="text-sm text-ink-2">Voters can pick up to {pos.seats} people.</span>
                )}
              </li>
            </ul>
          </section>
        );
      })}
      <Button variant="secondary" onClick={() => onChange([...value, newPosition()])} className="justify-self-start">
        <Plus className="size-4" aria-hidden="true" /> Add a position
      </Button>
    </div>
  );
}
