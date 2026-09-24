import { supabaseBrowser } from './supabase/client';
import type { Position } from './voting/types';

export interface DraftCandidate {
  key: string;
  name: string;
  bio: string;
  photo_url: string | null;
  photoFile?: File | null;
  photoPreview?: string | null;
}

export interface DraftPosition {
  key: string;
  title: string;
  seats: number;
  candidates: DraftCandidate[];
}

export const newKey = () => crypto.randomUUID();

export function emptyCandidate(): DraftCandidate {
  return { key: newKey(), name: '', bio: '', photo_url: null };
}

export function newPosition(title = '', seats = 1): DraftPosition {
  return { key: newKey(), title, seats, candidates: [emptyCandidate(), emptyCandidate()] };
}

export function fromPositions(positions: Position[]): DraftPosition[] {
  return positions.map((p) => ({
    key: p.id,
    title: p.title,
    seats: p.seats,
    candidates: p.candidates.map((c) => ({ key: c.id, name: c.name, bio: c.bio ?? '', photo_url: c.photo_url })),
  }));
}

// Blank rows are ignored rather than treated as mistakes.
export function tidyBallot(positions: DraftPosition[]): DraftPosition[] {
  return positions
    .map((p) => ({ ...p, candidates: p.candidates.filter((c) => c.name.trim() || c.bio.trim() || c.photoFile || c.photo_url) }))
    .filter((p) => p.title.trim() || p.candidates.length);
}

export function ballotProblem(positions: DraftPosition[]): string | null {
  const tidy = tidyBallot(positions);
  if (!tidy.length) return 'Add at least one position, like “President”.';
  for (const [i, p] of tidy.entries()) {
    const label = p.title.trim() ? `“${p.title.trim()}”` : `Position ${i + 1}`;
    if (!p.title.trim()) return `${label} needs a name.`;
    if (!p.candidates.length) return `${label} needs at least one candidate.`;
    if (p.candidates.some((c) => !c.name.trim())) return `Every candidate in ${label} needs a name.`;
    if (!Number.isInteger(p.seats) || p.seats < 1 || p.seats > 50) return `${label}: the number of winners must be between 1 and 50.`;
  }
  return null;
}

export async function resizeImage(file: File, max = 480): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that photo.'))), 'image/jpeg', 0.82),
  );
}

// Uploads any new photos and returns the ballot in the shape the database expects.
export async function ballotPayload(orgId: string, positions: DraftPosition[]) {
  const supabase = supabaseBrowser();
  const tidy = tidyBallot(positions);
  return Promise.all(
    tidy.map(async (p) => ({
      title: p.title.trim(),
      seats: p.seats,
      candidates: await Promise.all(
        p.candidates.map(async (c) => {
          let photo = c.photo_url;
          if (c.photoFile) {
            const path = `${orgId}/${newKey()}.jpg`;
            const blob = await resizeImage(c.photoFile);
            const { error } = await supabase.storage
              .from('candidate-photos')
              .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
            if (error) throw new Error(`We couldn't upload the photo for ${c.name || 'a candidate'}. Try a smaller photo.`);
            photo = supabase.storage.from('candidate-photos').getPublicUrl(path).data.publicUrl;
          }
          return { name: c.name.trim(), bio: c.bio.trim(), photo_url: photo };
        }),
      ),
    })),
  );
}
