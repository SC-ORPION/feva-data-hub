import type { Metadata } from 'next';
import { Article, SiteShell } from '@/components/site-shell';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = { title: 'About' };

export default function AboutPage() {
  return (
    <SiteShell>
      <Article
        title={`About ${APP_NAME}`}
        intro="We make it simple for any group to hold a vote that everyone accepts, from a phone, without an app."
      >
        <h2>Why we built it</h2>
        <p>
          Too many elections end in arguments about the count. Paper ballots get lost, WhatsApp polls can be gamed, and generic survey
          tools cannot stop one person voting twice. We wanted a way to run a vote where the rules are enforced by the system and
          the losing side can check the count for themselves.
        </p>

        <h2>What we promise</h2>
        <ul>
          <li>Your vote is secret. Ballots are stored with no link to the person who cast them.</li>
          <li>One person, one vote. It holds even if someone submits from two phones at once.</li>
          <li>The count is public. After voting closes, anyone can check that ballots match voters.</li>
          <li>You own your voter list. Delete everyone’s details when the vote is over. The results stay.</li>
        </ul>

        <h2>Who it is for</h2>
        <p>
          Any group that needs to choose people or decide a question: associations, unions, clubs, cooperatives, alumni groups,
          nonprofits, boards, religious bodies and schools. If your members have phones, they can vote.
        </p>

        <h2>Built for Ghana first</h2>
        <p>
          Sign in works with Ghana phone numbers (024…, +233…), sends texts through a Ghanaian SMS gateway, prices are in cedis,
          and printed voting codes work for people without smartphones. Twi, Ga and Ewe are on our list.
        </p>

        <h2>Talk to us</h2>
        <p>
          Questions, ideas or a large election to plan? Use the <a href="/contact">contact page</a>.
        </p>
      </Article>
    </SiteShell>
  );
}
