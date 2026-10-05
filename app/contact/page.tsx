import type { Metadata } from 'next';
import { ContactForm } from '@/components/contact-form';
import { SiteShell } from '@/components/site-shell';
import { CONTACT_EMAIL } from '@/lib/config';

export const metadata: Metadata = { title: 'Contact' };

export default function ContactPage() {
  return (
    <SiteShell>
      <div className="max-w-xl">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Contact us</h1>
        <p className="mt-4 text-lg text-ink-2">
          Questions, an invoice for a bigger election, or something not working? Send a message and we will reply by email.
        </p>
        {CONTACT_EMAIL && (
          <p className="mt-3 text-ink-2">
            Or write to <span className="font-mono font-semibold text-ink select-all">{CONTACT_EMAIL}</span>.
          </p>
        )}
        <div className="mt-8">
          <ContactForm />
        </div>
      </div>
    </SiteShell>
  );
}
