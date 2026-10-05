import type { Metadata } from 'next';
import { SiteShell } from '@/components/site-shell';

export const metadata: Metadata = { title: 'Help' };

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: 'For organizers',
    items: [
      ['How do I start an election?', 'Create an account, then choose Start an election. A six-step builder asks about the vote, how voters sign in, the voter list, positions and candidates, timing, and a final check.'],
      ['Why is my organization "waiting for approval"?', 'New organizations are approved by the platform team before they can open voting. An official email address helps. You can build your election while you wait.'],
      ['Which sign-in method should I pick?', 'Email is free and works for most groups. Phone number sends a text code, which costs a little. ID number lets voters type their member or student ID. Voting codes need no personal details: you print or share a private code per person.'],
      ['What does the 50% + 1 rule do?', 'A single-winner position needs more than half of the valid votes. If nobody gets there, you can start a run-off between the top two in one click, with the same voter list. Printed codes keep working.'],
      ['Can I change candidates after voting opens?', 'No. The ballot locks when voting opens so nobody can change it mid-vote. Use the preview page to check everything first.'],
      ['Can I see how a person voted?', 'No. Ballots have no link to voters, and organizers cannot read them either. You can see who has voted, not what they chose.'],
      ['How do I remind people to vote?', 'Open the election and use Remind. It emails or texts everyone who has not voted yet, at most once every 30 minutes.'],
      ['How do I delete voter details?', 'After voting closes, open the election and choose Delete voter details. Turnout and results stay. The details cannot be recovered.'],
    ],
  },
  {
    title: 'For voters',
    items: [
      ['I did not get my code', 'Check your spam folder or wait a minute, then ask for a new one. Codes expire after 10 minutes. If it still fails, your organizer may have a different email or number on the list.'],
      ['It says my code is wrong', 'You get five tries per code. Ask for a new code and type the latest one.'],
      ['Can I change my vote?', 'Not after you confirm. The review screen is your last chance, so check it carefully.'],
      ['How do I know my vote counted?', 'Keep your receipt code. After voting closes, the count check page shows your ballot’s public fingerprint. It confirms your ballot was counted but never shows who you voted for.'],
      ['I cannot vote because I am not on the list', 'Ask your organizer to add you. Only people on the voter list can vote.'],
    ],
  },
];

export default function HelpPage() {
  return (
    <SiteShell>
      <h1 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">Help</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-2">
        Answers to common questions. Can’t find yours? Use the <a href="/contact" className="font-semibold text-accent hover:underline">contact page</a>.
      </p>
      {GROUPS.map((g) => (
        <section key={g.title} className="mt-12 max-w-2xl">
          <h2 className="text-xl font-bold">{g.title}</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {g.items.map(([q, a]) => (
              <details key={q} className="group py-1">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-2 font-semibold [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="text-ink-3 transition-transform duration-150 group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="pb-3 text-ink-2">{a}</p>
              </details>
            ))}
          </div>
        </section>
      ))}
    </SiteShell>
  );
}
