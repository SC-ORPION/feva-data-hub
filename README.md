# FEVA Vote

Secret, one-person-one-vote elections for schools, churches, associations and any group, built for Ghana first.

Built with Next.js, Supabase (database, auth, storage and the voting rules) and deployed on Vercel.

Organizers set up an election in a few minutes. Voters open a link on any phone, prove who they are with a one-time code, vote one position at a time, and get a receipt. The count is ready the moment voting closes.

## What it does

**For organizers**
- Sign up an organization. The first account on a new install runs the platform and approves organizations.
- Six-step election builder: about the vote → how voters sign in → voter list → positions and candidates → timing and results → check and create.
- Four ways for voters to sign in, locked per election:
  - **Email**: a 6-digit code is emailed to them
  - **Phone number**: a 6-digit code by SMS (Arkesel)
  - **ID number**: they type their student/member ID; the code goes to the email or phone on the list
  - **Voting codes**: private 10-character codes you print (with QR codes) or share; no personal details needed
- Voter lists by pasting (straight from Excel or Google Sheets), or uploading `.xlsx`, `.csv` or `.txt`. Columns are detected and can be corrected. Ghana numbers (`024…`, `+233…`) are normalized.
- Candidate photos (resized in the browser to save data), multi-winner positions, and Yes/No voting when someone stands unopposed.
- Preview the ballot exactly as voters will see it before opening.
- Open and close by hand, or set times. The ballot locks when voting opens.
- Winner rules: most votes wins, or **more than half of the valid votes (50% + 1)**, as in SRC constitutions. When nobody passes half, one click sets up a run-off between the top two with the same voter list (printed codes keep working).
- Remind people who haven't voted by email or SMS (at most every 30 minutes).
- Live turnout, live or hidden results (your choice), a recount check that matches ballots to turnout, CSV downloads, and an activity log.
- Email results to voters when voting closes.
- Delete all voter details after the vote. Turnout and results stay.

**For voters, candidates and agents**
- No account, no password, no app. One position per page, big tap targets, a review screen, and a clear “you can’t change it after this” step.
- A receipt code that confirms their ballot was counted. It never shows the choices again, so it can't be used to prove a vote to a vote buyer.
- A public **Check the count** page after voting closes: ballots counted vs. people marked as voted vs. the voter list, a receipt check, and a download of every counted ballot's fingerprint. Losing candidates can verify the count themselves instead of petitioning for an audit.
- Turnout stays visible even when the organizer hides results until the close.

## How the vote stays fair

- Ballots are stored with no link to the voter and no timestamps. The voter list only records *that* someone voted and when.
- `cast_ballot` runs in one database transaction with a row lock, so a person can’t vote twice even if they submit from two phones at once.
- Voters, ballots and sign-in codes are only reachable by the server. Organizers can’t read ballots, change who has voted, or approve their own organization.
- Positions and candidates can’t be edited once voting opens.
- Sign-in codes expire after 10 minutes and allow 5 tries. Voter sessions are signed, http-only cookies.

These rules live in the database (`supabase/migrations`), not just in the app.

## Set it up

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run each file in `supabase/migrations/` in order (oldest first): `20260924000000_voting_platform.sql`, then `20260925000000_runoffs_and_audit.sql`. (Or, with the Supabase CLI: `supabase link` then `supabase db push`.) The first one removes the old data-hub tables if they exist.
3. **Authentication → URL Configuration**: set **Site URL** to your app’s address (for example `https://fevavote.vercel.app`) and add `https://your-address/**` to **Redirect URLs**.
4. **Authentication → Emails → SMTP Settings**: add your own SMTP details. Supabase’s built-in email only sends a handful of emails an hour, which isn’t enough for sign-up confirmations.

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill it in. You need at least:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page. Server only: never put it in client code. |
| `VOTER_SESSION_SECRET` | Any long random string, e.g. `openssl rand -base64 48` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Your email provider (Gmail app password, Zoho, Brevo, Resend…) |

For phone-number elections add `ARKESEL_API_KEY` and `SMS_SENDER_ID` (register the sender ID with Arkesel first).

To try it before email or SMS is set up, set `OTP_TEST_MODE=true`: sign-in codes are shown on screen. Turn it off before a real election.

### 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000, sign up, and you’ll be the platform owner. Go to **Approvals** and approve your own organization, then create an election.

### 4. Deploy (Vercel)

1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com), **Add New → Project**, import the repository.
3. Add the same environment variables in the project’s settings, then deploy.
4. Put the deployed address into Supabase’s **Site URL** and **Redirect URLs** (step 1.3).
5. **Sign up straight away.** The first account created becomes the platform owner.

### 5. Optional: a subdomain for each organization

To have `achimota-src.fevavote.com` instead of `fevavote.com/v/achimota-src`:

1. Add both `fevavote.com` and `*.fevavote.com` to the Vercel project (wildcard domains need Vercel’s nameservers).
2. Set `NEXT_PUBLIC_ROOT_DOMAIN=fevavote.com` and redeploy.

`proxy.ts` sends each subdomain to that organization’s voting pages. The `/v/<org>` links keep working.

## Product and design context

- `PRODUCT.md`: who it's for, positioning, constraints, principles. Decisions from competitor research live here (ElectionBuddy, OpaVote, Simply Voting, Election Runner, Helios, and Ghanaian platforms such as FastVote and CelerVote).
- `DESIGN.md`: the visual system ("The Ballot Paper"): tokens, type, motion and component rules.

### Design skills for Claude Code

This repository ships two sets of agent skills in `.claude/skills/`, picked up automatically by Claude Code:

- **Impeccable** (Paul Bakaus, Apache-2.0): `/impeccable audit`, `critique`, `polish`, `harden` and more. Run the anti-pattern detector with `./.claude/skills/impeccable/scripts/impeccable detect app components`.
- **Emil Kowalski's design engineering skills** (MIT): `emil-design-eng`, `review-animations`, `improve-animations`, `animate` and others, for motion and interaction polish.

## Project layout

```
app/
  page.tsx                  Landing page
  signup, login, …          Organizer accounts
  dashboard/                Elections list, builder (new), election page, slips, settings, approvals
  v/[org]/…                 Voting pages: organization home, voting, public results, public count check
  api/vote/…                Voter sign-in, code check, ballot submit, receipt lookup
  api/results/…             Public results (respects the organizer’s visibility choice)
  api/admin/…               Emailing results
components/                 UI, admin and voting components
lib/voting/                 Rules shared by server and browser: phases, tallying, codes, security
supabase/migrations/        The database: tables, row level security, voting functions
proxy.ts                    Subdomain routing
```

## Not in this version yet

- Payments (pay per voter and SMS, with mobile money)
- Turnout by hall, class or faculty
- Self-registration (voters signing themselves up for approval)
- Ranked-choice voting
- USSD voting for phones without internet
- Twi, Ga, Ewe and other languages
- More than one admin per organization (the database already supports it)
- Custom domains per organization
