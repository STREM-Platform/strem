# Tribe Design

Tribes are the accountability backbone of STREM. They are small, purposeful groups — not social media audiences.

The product should feel like a locker room, not an Instagram feed. Tribes exist to create the kind of accountability that makes you show up on the days you don't want to, because people who know you are expecting you.

See also: `product/game-systems.md` for tribe XP mechanics, `vision/transformation-psychology.md` for the social identity psychology behind this design.

---

## Philosophy

Most fitness app community features fail because they optimize for breadth: more followers, more likes, more content. This creates passive consumption, not active accountability.

STREM's tribes are designed on a different premise: small is powerful. A tight group of 4–8 people who see your check-ins daily creates more behavioral pressure than 10,000 followers who don't know your name.

The design principle: every tribe mechanic should increase the cost of not showing up — not through punishment or shame, but through genuine belonging and expectation.

---

## Tribe Size

**Target size: 4–8 members. Hard cap: 10.**

The rationale is grounded in group accountability research: below 4, the group is too small to sustain itself when one person goes inactive; above 10, social loafing increases and personal accountability diffuses. The sweet spot is a group small enough that every member is known and missed.

The system should gently encourage tribes toward 5–7 members during formation.

---

## Tribe Formation (MVP)

MVP tribe formation is manual and trust-based. No algorithmic discovery.

**Creating a tribe:**
- User creates a tribe with a name and optional mission statement (one sentence: "We train, we return, we don't make excuses.")
- Creator becomes tribe admin
- Creator receives an invite code to share with trusted contacts

**Joining a tribe:**
- User enters invite code
- Tribe admin approves (or auto-approval is enabled at creation)
- User is visible to tribe members immediately

**Tribe types (MVP):**
- Invite-only: all joins require code + approval
- Open tribes (V2): discoverable and joinable without invite

Algorithmically matched tribes belong to V2. In MVP, trust is established through the human relationship, not the algorithm. Users who invite people they actually know create stronger accountability than matched strangers.

---

## Tribe Formation (V2)

Version 2 adds:
- Public tribe discovery: browse tribes by theme (endurance, hybrid athlete, strength, discipline, recovery)
- AI-assisted matching: suggestions based on training style, timezone, intensity level, and stated goals
- Open tribe option: anyone can join without invite
- Tribe profile page: public description, collective XP (Tribe Power), current active challenge

---

## Check-in System

### Cadence

Default: daily check-in prompt. Optional, not mandatory.

The system sends a daily nudge to members who have not checked in. The nudge is gentle and framed around the tribe, not personal failure: "Your tribe is active today — share a quick update."

Members can mute check-in prompts if they choose. The tribe still sees their log activity.

### Format

Check-ins are short and structured — not free-form social media posts.

MVP check-in structure:
1. What did you complete today? (dropdown or short text — training, running, nutrition, recovery, rest day, or nothing)
2. One sentence of status (optional free text)

This format keeps check-ins honest and fast — under 30 seconds. It prevents the check-in from becoming a content creation task.

### Visibility

Check-ins are visible only to tribe members. They are never public. They are never indexed or shared outside the tribe.

### Weekly Tribe Summary

Every Sunday, the AI coach generates a weekly tribe summary and shares it with tribe members. The summary covers:
- collective XP earned this week (Tribe Power)
- members who completed missions or challenges
- overall participation rate
- one observation from the AI coach ("This was your tribe's strongest week for running — 4 members logged distances.")
- the week ahead (any active challenges, upcoming missions)

The weekly summary creates a shared narrative and reminds members that their individual effort contributes to something collective.

---

## Tribe XP — Tribe Power

Every action a tribe member takes that earns individual XP also contributes to the tribe's collective XP pool, called Tribe Power.

Tribe Power is displayed on the tribe's profile. It represents the collective effort the tribe has invested.

Tribe Power creates shared pride and identity. A tribe with 50,000 Tribe Power has earned that through real consistency — not platform manipulation.

Tribe Power does not decay. It is cumulative and permanent, reflecting the tribe's full history.

---

## Accountability Loop

### Passive Accountability

Tribe members can see each other's recent activity (training, running, nutrition, check-ins). This passive visibility creates behavioral pressure: members who see their tribe training are more likely to train.

### Active Accountability

When a tribe member has not checked in or logged any activity for 3+ days, other tribe members see a gentle prompt: "Check on [Name] — they haven't logged in 3 days."

This prompt is only visible to tribe members, not to the missing member. It is framed as care, not surveillance. Members can send a direct encouragement message to the inactive member.

The AI coach also uses tribe activity as a context signal when generating missions for individual users: "Your tribe has logged 12 sessions this week — time to match their energy."

### What Accountability Is Not

STREM does not use shame mechanics. The following are explicitly prohibited:
- Public notifications when a member misses a day
- Leaderboards that rank members by missed sessions
- Automatic tribe alerts broadcasting a member's failures
- Negative language in any automated accountability message

Accountability should feel like a training partner texting "you coming today?" — not a public scorecard.

---

## Tribe Challenges

Tribes can participate in challenges together, earning collective XP and tribe-specific medals.

### MVP Tribe Challenge (1 type)

**Collective Commitment Challenge**: The tribe sets a shared target within a defined timeframe.

Examples:
- "Reach 50 collective training sessions in 2 weeks."
- "Log 200km of collective running this month."
- "All members check in every day for 7 days."

Tribe challenges are accepted voluntarily. No member is forced to participate. The system tracks individual contributions toward the collective goal and shows progress to the tribe.

### V2 Tribe Challenges

- Tribe vs. tribe: two tribes compete on a shared metric (distance, sessions, XP, completion rate)
- Seasonal tribe missions: exclusive challenges tied to active seasons
- AI-generated tribe challenges: the AI coach generates a custom challenge for the tribe based on collective activity patterns

---

## Tribe Moderation

### Roles (MVP)

| Role | Permissions |
|------|-------------|
| Admin (tribe creator) | Invite members, remove members, rename tribe, delete tribe, resolve reports |
| Member | Check in, log activity, post messages, report content |

Admin cannot see individual training logs of members — only activity signals (logged today: yes/no, check-in completed: yes/no). Full privacy of logs is preserved.

### Content Rules

Prohibited content in tribe spaces:
- Spam or unsolicited commercial content
- Explicit, violent, or discriminatory content
- Unsolicited supplement or product promotions
- Screenshots of other members' private data
- Coordinated harassment of any member

Every check-in and message has a report button. Reports are reviewed by STREM within 24 hours (manual in MVP).

### Escalation

- First offense: warning
- Second offense: temporary mute (7 days)
- Third offense: permanent tribe ban, evaluated for platform ban

Tribe admins can remove members at any time for any reason within their tribe. Removal is immediate and does not notify the removed member publicly.

### V2 Moderation

Version 2 introduces AI-assisted moderation: automated detection of prohibited content categories before display, with human review for borderline cases. This allows faster response at scale.

---

## Privacy Rules

| Data | Visible To |
|------|------------|
| Individual training log details | User only + future optional sharing |
| Individual nutrition logs | User only (never shared with tribe) |
| Check-in text (daily status) | Tribe members only |
| Activity signal (logged today: yes/no) | Tribe members only |
| Tribe Power (collective XP) | Public (tribe profile) |
| Individual XP and rank | User controls visibility |
| Tribe membership list | Tribe members only in MVP |

Tribe data is GDPR-in-scope. Tribe check-ins are personal data. Users who leave a tribe retain their individual data; their check-in history within the tribe is removed from tribe-visible history.

---

## Tribe Lifecycle

### Formation

User creates or joins a tribe. Tribe is immediately active.

### Active Tribe

Members log, check in, complete challenges. Tribe Power accumulates. Weekly summaries are delivered.

### Inactive Tribe

If no tribe member logs any activity for 14+ days, the tribe enters a "Quiet" state. The system sends a gentle re-engagement nudge to admin: "Your tribe has been quiet for 2 weeks. Send a message to bring them back."

No automatic dissolution. Tribes are not deleted by the platform.

### Leaving a Tribe

Members can leave at any time. No approval required. Tribe admin is notified silently.

If admin leaves, admin status transfers to the longest-standing member. If no other members remain, the tribe is archived.

### Rejoining

Users who leave a tribe can rejoin only via new invite. This prevents abuse of join/leave mechanics to avoid accountability.

---

## What Tribes Are Not

Tribes are not:
- Social media groups or generic chat rooms
- Influencer audiences
- Public forums
- Coaching platforms (coaches belong in a future coach service)
- Marketing channels for STREM

Tribes exist for one purpose: to make users feel genuinely known, expected, and supported — so that showing up is the easier choice.
