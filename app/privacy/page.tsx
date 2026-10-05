import type { Metadata } from 'next';
import { Article, SiteShell } from '@/components/site-shell';
import { APP_NAME, CONTACT_EMAIL } from '@/lib/config';

export const metadata: Metadata = { title: 'Privacy notice' };

export default function PrivacyPage() {
  return (
    <SiteShell>
      <Article title="Privacy notice" intro="What we collect, why, and how you stay in control.">
        <p>Last updated: 29 September 2026.</p>

        <h2>The short version</h2>
        <ul>
          <li>Your vote is secret. A ballot has no link to you and no time stamp.</li>
          <li>We record <em>that</em> you voted and when, so nobody votes twice. We do not record what you chose against your name.</li>
          <li>Organizers can delete every voter’s personal details after the vote. Turnout and results stay.</li>
          <li>We do not sell personal details or use them for advertising.</li>
        </ul>

        <h2>What we collect</h2>
        <p>
          <strong>From organizers:</strong> name, email, organization name and the election details you enter.
        </p>
        <p>
          <strong>About voters (uploaded by the organizer):</strong> some or all of name, email, phone number, ID number or a private
          voting code, depending on how the election signs voters in. We also keep whether a person has voted and when.
        </p>
        <p>
          <strong>Ballots:</strong> the choices made, stored separately with no reference to the voter. A one-way fingerprint of the
          receipt code lets a voter confirm their ballot was counted.
        </p>
        <p>
          <strong>Sign-in codes:</strong> stored only as a one-way hash, and they expire after 10 minutes.
        </p>

        <h2>Why we use it</h2>
        <ul>
          <li>To check who may vote and to stop double voting.</li>
          <li>To send sign-in codes, receipts, reminders and results by email or text.</li>
          <li>To count the votes and show the public count check.</li>
          <li>To keep the service secure and to answer support requests.</li>
        </ul>

        <h2>Who sees it</h2>
        <p>
          The organizer of an election can see its voter list and who has voted, but never how anyone voted. We use service providers to
          run {APP_NAME}: hosting, a database, and email and SMS delivery. They only handle data to provide the service.
        </p>

        <h2>How long we keep it</h2>
        <p>
          Organizers can delete voter details at any time after voting closes. Ballots and results are kept so counts can be checked.
          Ask us to delete your organizer account and we will.
        </p>

        <h2>Your rights</h2>
        <p>
          Under Ghana’s Data Protection Act, 2012 (Act 843), you can ask what we hold about you, ask us to correct or delete it, and
          complain to the Data Protection Commission. If your details came from an organizer’s voter list, ask the organizer first, and
          contact us if you need help.
        </p>

        <h2>Cookies</h2>
        <p>
          We use only the cookies needed to keep you signed in (organizers) or to keep a voting session safe (voters). We do not use
          advertising or tracking cookies.
        </p>

        <h2>Contact</h2>
        <p>
          Use the <a href="/contact">contact page</a>
          {CONTACT_EMAIL ? ` or write to ${CONTACT_EMAIL}` : ''}.
        </p>
      </Article>
    </SiteShell>
  );
}
