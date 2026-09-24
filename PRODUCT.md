# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) on Vercel, with Supabase for the database, authentication, storage and server-side rules. Chosen by the product owner; deploy target is Vercel from GitHub.

## Users

- **Organizers**: the people who run an election. SRC electoral commissioners at universities, teachers or senior housemasters at senior high schools, church council secretaries, executives of associations, unions, alumni groups and clubs. Often not technical, often setting up an election for the first time, usually on a laptop, sometimes on a phone.
- **Voters**: students, church members and association members. Almost always on a phone, often on a cheap Android device with limited data and patchy connectivity. Some have no smartphone and vote from a printed code slip on a shared or borrowed device.
- **Losing candidates and their agents**: they need to be convinced the count was fair. Their trust decides whether the result is accepted or petitioned.
- **The platform owner**: approves organizations before they can run live elections.

## Product Purpose

Let any Ghanaian school, church or group run a secret, one-person-one-vote election from phones, with a result everyone accepts. Success is a vote where eligible people could vote easily, nobody voted twice, nobody can see who voted for whom, and the losing side has no grounds for a petition.

## Positioning

Built for how elections actually run in Ghana: the voter list stays under the organization's control and can be deleted after the vote; voters prove who they are with a one-time code (familiar from mobile money) instead of a password; SRC rules such as 50%+1 with a run-off between the top two are built in; unopposed candidates get a Yes/No vote as on real ballots; printed code slips cover students without smartphones. Local competitors lead with paid award-show voting; global tools (ElectionBuddy, OpaVote, Simply Voting) are priced and designed for Western organizations and often skip one-time-code verification.

## Operating Context

- Organizers already hold voter data in Excel, Google Sheets, school management exports or WhatsApp lists, and paste or upload it.
- Voting links travel through WhatsApp groups, SMS, notice boards and posters (QR codes).
- SRC elections follow a written constitution enforced by a student Electoral Commission; disputes go to a Judicial Council or the Dean of Students. Audit petitions after e-voting are common.
- Run-offs must happen within days of the first round, to the same electorate.
- Time zone is Africa/Accra (UTC+0). Phone numbers are Ghanaian (024, 020, 050, 055… or +233).

## Capabilities and Constraints

- Voter sign-in methods, locked per election: email, phone number (SMS), ID number (code sent to the contact on file), or printed voting codes.
- The ballot locks when voting opens. Each person votes once, enforced in the database.
- Ballots never link to a voter and carry no timestamps. Receipts confirm a ballot was counted but do not reveal choices after the voting session (decided to resist vote buying).
- Organizers choose whether results are live or revealed after close, and when to delete voter details.
- Monetization: pay per voter and pass on SMS costs, paid with mobile money. Not built yet; nothing on the site may promise "free".
- Not built yet: self-registration, ranked choice, USSD voting, local-language interfaces, multiple admins per organization, custom domains per organization.

## Brand Commitments

- Name: FEVA Vote (configurable through `NEXT_PUBLIC_APP_NAME`).
- Voice: plain, short sentences a secondary-school student or a church elder understands on first read. No jargon ("authenticate", "ballot enumeration"), no hype, no apologies. Errors say what went wrong and what to do.
- The product owner rejects anything that reads as generic AI-generated design.

## Evidence on Hand

- No customers, testimonials, press, usage numbers or logos exist yet. Do not invent any.
- Example names and organizations in the UI (Achimota School SRC, Kwame Asante, Efua Owusu) are illustrations, not claims.
- Research references: UG SRC Constitution Article 30(7) (50%+1, run-off within seven days), UG 2022 audit petition, Central University 2025 SRC dispute, ElectionBuddy and OpaVote reviews.

## Product Principles

1. **The result must survive a petition.** Every rule that decides who can vote, what counts and who won is enforced by the system and can be checked by outsiders.
2. **The voter's secret is sacred.** No feature may let anyone, organizers included, connect a person to their choices, or let a voter prove their choices to someone else.
3. **Nobody is locked out.** Design for the cheapest phone, the slowest network and the voter with no phone at all.
4. **Simple on the surface.** One decision per step; power features appear only when they apply.
5. **The organization owns its data.** Collect only what the vote needs, and let organizers delete it.

## Accessibility & Inclusion

- WCAG 2.2 AA contrast and keyboard access across organizer and voter surfaces.
- Voter screens must work one-handed on a 360px-wide phone with large tap targets, and on a shared computer.
- English is the working language; copy must be simple enough to translate into Twi, Ga and Ewe later.
