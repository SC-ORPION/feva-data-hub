import type { Metadata } from 'next';
import { PricingCalculator } from '@/components/pricing-calculator';
import { ButtonLink } from '@/components/ui/button';
import { SiteShell } from '@/components/site-shell';
import { money, PRICING } from '@/lib/pricing';

export const metadata: Metadata = { title: 'Pricing', description: 'Pay for the voters you have. No monthly fee.' };

export default function PricingPage() {
  return (
    <SiteShell>
      <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Pay for the voters you have. No monthly fee.</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">
        Each election is priced on its own. A small election costs nothing, and you always see the total before you open voting.
      </p>

      <dl className="mt-10 grid gap-6 sm:grid-cols-3">
        {[
          [`First ${PRICING.freeVoters} voters`, 'Free', 'Every election. Try the whole thing with a real group.'],
          ['Each voter after that', `${money(PRICING.perVoter)}`, 'Per voter, once per election. Run-offs with the same list cost nothing extra.'],
          ['Text message', `${money(PRICING.perSms)}`, 'Per message. Email sign-in and printed codes are free to send.'],
        ].map(([label, price, note]) => (
          <div key={label} className="border-t-2 border-ink pt-3">
            <dt className="font-bold">{label}</dt>
            <dd className="mt-1 font-mono text-2xl font-bold tabular">{price}</dd>
            <dd className="mt-1 text-ink-2">{note}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-14" aria-labelledby="calc">
        <h2 id="calc" className="mb-4 text-2xl font-bold">
          Work out your cost
        </h2>
        <PricingCalculator />
      </section>

      <section className="mt-14 max-w-2xl">
        <h2 className="text-2xl font-bold">What every election gets</h2>
        <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-ink-2">
          <li>Secret ballots, one vote per person, and a receipt that proves nothing to a vote buyer</li>
          <li>The public count check page for candidates and agents</li>
          <li>50% + 1 rule and run-offs with the same voter list</li>
          <li>Live turnout, results, CSV downloads and an activity log</li>
          <li>Deleting all voter details when the vote is over</li>
        </ul>
        <p className="mt-6 text-ink-2">
          Paying is not switched on in the app yet. While we finish it, ask us for an invoice on the{' '}
          <a href="/contact" className="font-semibold text-accent hover:underline">
            contact page
          </a>{' '}
          for elections bigger than {PRICING.freeVoters} voters.
        </p>
        <ButtonLink href="/signup" size="lg" className="mt-6">
          Start an election
        </ButtonLink>
      </section>
    </SiteShell>
  );
}
