'use client';

import { ExternalLink, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { Button, buttonClass } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';

export function useQr(url: string, width = 480) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width, color: { dark: '#13201a', light: '#ffffff' } })
      .then(setSrc)
      .catch(() => setSrc(null));
  }, [url, width]);
  return src;
}

export function ShareBox({ url, live }: { url: string; live: boolean }) {
  const [showQr, setShowQr] = useState(false);
  const qr = useQr(url);

  return (
    <div className="grid gap-3 rounded-lg border border-line bg-card p-5">
      <div>
        <h3 className="font-bold">Voting link</h3>
        <p className="text-sm text-ink-2">
          {live ? 'Share this with voters by WhatsApp, SMS, email or a poster.' : 'This link starts working once you open voting.'}
        </p>
      </div>
      <p className="rounded-md bg-sunk px-3 py-2.5 font-mono text-sm break-all select-all">{url}</p>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={url} label="Copy link" />
        <a href={url} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>
          <ExternalLink className="size-4" aria-hidden="true" /> Open
        </a>
        <Button variant="secondary" onClick={() => setShowQr((v) => !v)} aria-expanded={showQr}>
          <QrCode className="size-4" aria-hidden="true" /> {showQr ? 'Hide QR code' : 'QR code'}
        </Button>
      </div>
      {showQr && qr && (
        <div className="flex flex-wrap items-end gap-4 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
          <img src={qr} alt={`QR code for ${url}`} className="size-44 rounded-md border border-line bg-white p-2" />
          <div className="grid gap-2 text-sm text-ink-2">
            <p>Put it on a poster or a slide. Phones open the link when they scan it.</p>
            <a href={qr} download="voting-link-qr.png" className={buttonClass('secondary', 'sm', 'justify-self-start')}>
              Download image
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
