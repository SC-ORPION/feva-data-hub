import { ArrowRight, KeyRound, ListChecks, Printer, Receipt, ShieldCheck, Trash2 } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { Initials, ThumbBox } from '@/components/voting/thumb-box';
import { APP_NAME } from '@/lib/config';

function BallotPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-label="Example of a ballot on a phone">
      <div className="rounded-lg border border-line bg-card shadow-[0_24px_60px_-28px_rgba(19,32,26,0.35)]">
        <div className="border-b border-line px-5 py-4">
          <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Achimota School SRC</p>
          <p className="font-bold">SRC Elections 2026</p>
        </div>
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between text-xs text-ink-2">
            <span>Position 1 of 4</span>
            <span>Choose one</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk">
            <div className="h-full w-1/4 rounded-full bg-accent" />
          </div>
          <p className="mt-4 text-xl font-bold">SRC President</p>
        </div>
        <ul className="grid gap-2 p-5">
          {[
            { name: 'Kwame Asante', note: 'Form 3 Science', on: false },
            { name: 'Efua Owusu', note: 'Form 3 General Arts', on: true },
          ].map((c) => (
            <li
              key={c.name}
              className={`flex items-center gap-3 rounded-md border p-3 ${c.on ? 'border-accent bg-accent-soft' : 'border-line'}`}
            >
              <Initials name={c.name} className="size-11 text-base" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.name}</span>
                <span className="block text-sm text-ink-2">{c.note}</span>
              </span>
              <ThumbBox selected={c.on} />
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-line px-5 py-3">
          <span className="text-sm font-semibold text-ink-3">Back</span>
          <span className="text-sm font-semibold text-accent">Next</span>
        </div>
      </div>
      <div className="absolute -top-6 -right-2 rounded-md border border-line bg-card px-4 py-2.5 shadow-lg sm:-right-10">
        <p className="text-xs text-ink-2">Turnout so far</p>
        <p className="font-mono text-lg font-bold tabular">
          412 <span className="text-sm font-normal text-ink-2">of 530 voted</span>
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    title: 'Add your voters',
    body: 'Upload a list of emails, phone numbers or student IDs. No list? Print a private voting code for each person instead.',
  },
  {
    title: 'Share one link',
    body: 'Voters open it on any phone. We send each person a one-time code to prove it is them. No app and no password.',
  },
  {
    title: 'Close voting, see the count',
    body: 'Results count themselves. Show them live while people vote, or keep them hidden until you close voting.',
  },
];

const PROMISES = [
  { icon: ShieldCheck, title: 'Secret ballot', body: 'Nobody can see who voted for whom. Not the organizers and not us.' },
  { icon: KeyRound, title: 'One person, one vote', body: 'Once someone votes, their email, number or code is used up.' },
  { icon: Receipt, title: 'A receipt for every voter', body: 'Each voter gets a code that lets them check their own vote later.' },
  { icon: Trash2, title: 'You own your list', body: 'Delete everyone’s details when you are done. The results stay.' },
  { icon: ListChecks, title: 'Count you can check', body: 'Recount from the ballots at any time and match it to turnout.' },
  { icon: Printer, title: 'Works without smartphones', body: 'Print code slips, and let students vote on a shared computer.' },
];

export default function Home() {
  return (
    <div className="px-4 sm:px-6">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 py-5">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <ButtonLink href="/login" variant="ghost">
            Sign in
          </ButtonLink>
          <ButtonLink href="/signup" className="hidden sm:inline-flex">
            Start an election
          </ButtonLink>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-14 pt-10 pb-20 md:grid-cols-[1.1fr_1fr] md:pt-16">
          <div className="max-w-xl">
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-[3.25rem] sm:leading-[1.05]">
              Run a fair vote from anyone’s phone.
            </h1>
            <p className="mt-5 text-lg text-ink-2">
              Set up your school, church or group election in a few minutes. Voters sign in with a one-time code,
              vote in under a minute, and the count is ready the moment voting closes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup" size="lg">
                Start an election <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#how" variant="secondary" size="lg">
                How it works
              </ButtonLink>
            </div>
            <p className="mt-5 text-sm text-ink-3">Nothing to install. It works in any phone browser.</p>
          </div>
          <BallotPreview />
        </section>

        <section id="how" className="border-t border-line py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold">How it works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.title} className="grid content-start gap-2">
                  <span className="font-mono text-sm font-bold text-accent">Step {i + 1}</span>
                  <h3 className="text-lg font-bold">{s.title}</h3>
                  <p className="text-ink-2">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="border-t border-line py-16">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_2fr]">
            <div>
              <h2 className="text-2xl font-bold">Built so people trust the result</h2>
              <p className="mt-3 text-ink-2">
                The rules are enforced by the system, not by a volunteer at a table. Losing candidates can see the
                count was fair.
              </p>
            </div>
            <ul className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
              {PROMISES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                  <div>
                    <h3 className="font-bold">{title}</h3>
                    <p className="mt-0.5 text-ink-2">{body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-line py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold">Who uses it</h2>
            <dl className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Universities and colleges', 'SRC, JCR, hall and department elections'],
                ['Senior high schools', 'Prefects, house captains and class reps'],
                ['Churches', 'Council, committee and youth fellowship elections'],
                ['Groups and associations', 'Alumni, unions, clubs and cooperatives'],
              ].map(([who, what]) => (
                <div key={who} className="border-t-2 border-ink pt-3">
                  <dt className="font-bold">{who}</dt>
                  <dd className="mt-1 text-ink-2">{what}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-14 flex flex-wrap items-center justify-between gap-4 rounded-lg bg-ink px-6 py-6 text-paper">
              <p className="text-lg font-bold">Your first election takes about ten minutes to set up.</p>
              <ButtonLink href="/signup" size="lg" className="bg-paper !text-ink hover:bg-sunk">
                Start an election
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 border-t border-line py-6 text-sm text-ink-3">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <span>Made for elections in Ghana</span>
      </footer>
    </div>
  );
}
