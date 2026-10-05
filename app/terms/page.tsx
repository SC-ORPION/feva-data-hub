import type { Metadata } from 'next';
import { Article, SiteShell } from '@/components/site-shell';
import { APP_NAME, CONTACT_EMAIL } from '@/lib/config';

export const metadata: Metadata = { title: 'Terms of use' };

export default function TermsPage() {
  return (
    <SiteShell>
      <Article title="Terms of use" intro={`The rules for using ${APP_NAME}, in plain language.`}>
        <p>Last updated: 29 September 2026.</p>

        <h2>Who these terms are for</h2>
        <p>
          <strong>Organizers</strong> create an account and run elections. <strong>Voters</strong> take part in an election an organizer
          set up. By using {APP_NAME} you agree to these terms.
        </p>

        <h2>What organizers agree to</h2>
        <ul>
          <li>You have the right to run the election and to use the voter details you upload.</li>
          <li>You will only add people who should be able to vote, and you will not try to find out how a person voted.</li>
          <li>You are responsible for the rules of your own election, including who is eligible and how a winner is decided.</li>
          <li>You will not use {APP_NAME} for anything illegal, to mislead voters, or to send unwanted messages.</li>
          <li>You keep your password private and tell us if you think someone else has used your account.</li>
        </ul>

        <h2>What voters agree to</h2>
        <ul>
          <li>You will vote only once, as yourself, with the code or details you were given.</li>
          <li>You will not share your sign-in code, and you will not try to vote for someone else.</li>
        </ul>

        <h2>Approval and suspension</h2>
        <p>
          New organizations are reviewed before they can open voting. We may refuse or suspend an organization or election that breaks
          these terms or looks like abuse.
        </p>

        <h2>Prices and payment</h2>
        <p>
          Prices are on the pricing page and are shown in cedis. Small elections are free. For larger ones we will agree the cost
          with you before voting opens.
        </p>

        <h2>Your data</h2>
        <p>
          You own your voter list and your results. How we handle personal details is explained in the{' '}
          <a href="/privacy">privacy notice</a>.
        </p>

        <h2>Our promises and their limits</h2>
        <p>
          We work hard to keep ballots secret and counts correct, and the rules are enforced in the database. We cannot promise the
          service will never be interrupted, and text messages and emails depend on networks we do not control. Plan enough time before
          the vote closes, and use the preview and a small test election first. To the extent the law allows, we are not liable for
          losses caused by things outside our control, such as network failures or a wrong voter list.
        </p>

        <h2>Changes</h2>
        <p>We may update these terms. The date at the top shows the latest version. If you keep using the service, you accept the update.</p>

        <h2>Contact</h2>
        <p>
          Questions? Use the <a href="/contact">contact page</a>
          {CONTACT_EMAIL ? ` or write to ${CONTACT_EMAIL}` : ''}.
        </p>
      </Article>
    </SiteShell>
  );
}
