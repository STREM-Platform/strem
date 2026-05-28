# Monetization

STREM should monetize through trust, utility, and premium ecosystem value. Monetization must not damage user safety, privacy, or product focus.

---

## MVP Monetization Position

The MVP may launch free, invite-only, or with a simple early premium plan. The first priority is retention and proof of repeated transformation value.

Do not build payment infrastructure in the MVP unless a separate decision approves it.

---

## Subscription — Primary Long-Term Model

### Free Tier

Entry-level access for users exploring STREM:

- complete onboarding and identity setup
- training, running, and nutrition logging
- basic XP earning and rank display (Initiate and Builder ranks)
- joining one tribe (limited check-in features)
- 3 medals available in free tier
- basic AI coach responses (summary of recent logs)
- limited mission generation (1 mission per week)

The free tier should demonstrate the transformation loop clearly — users must be able to see what premium unlocks before converting.

### Premium Tier

Full transformation experience. Targeted at users who have experienced the free tier and want the complete progression system.

**Game progression unlocks:**
- All 5 MVP ranks fully accessible with rank-up narrative coaching
- Full 10-medal set
- Full mission system: 1–3 adaptive missions per week across all pillar types
- Individual discipline challenges (7-day, 30-day, 90-day)
- Tribe collective challenges
- 7-day and 30-day streak XP bonuses

**AI coach depth:**
- Weekly narrative transformation coaching recap (Sunday delivery)
- Behavioral adaptation engine (re-engagement missions, burnout detection, milestone-proximity nudges)
- Extended context window: coach references up to 90 days of history (free tier: 14 days)
- Mission narrative feedback on completion (not just XP award)

**Tribe features:**
- Create tribes (free tier: join only)
- Full tribe admin tools
- AI-generated weekly tribe summary
- Accountability nudge system

**Future premium unlocks (V2+):**
- Access to seasonal arcs and seasonal exclusive medals
- AI-generated personal challenges
- Advanced AI mission arcs (multi-week connected missions)
- Tribe discovery and AI-assisted matching
- Path rank unlocks (Iron Mind, Mountain Runner, Iron Body, etc.)
- Extended tribe size (up to 10 members — free tier capped at joining, not creating)

### Pro Tier (Future)

For hybrid athletes who train at high volume, have specific performance goals, or lead tribes of serious performers.

- All premium features
- Wearable integration (V3)
- HRV-aware mission adaptation
- Advanced training load management
- Coach marketplace access with verified coaches
- Early access to new seasons and exclusive season medals
- Priority AI coach context (longer history, more frequent mission generation)

---

## Coach And Creator Revenue (Phase 3+)

Later phases may include:

- verified coach profiles and coach-led tribes
- paid programs linked to user's STREM identity and progression
- coach subscription revenue sharing
- creator content and education programs
- revenue sharing model for creators who generate validated transformation content

Coach and creator features require strong trust, moderation, and user protection frameworks before launch.

---

## Marketplace (Phase 4 Ecosystem Only)

Later ecosystem only, requiring sustained trust and proven moderation:

- meal prep services
- equipment partners
- curated supplements (no unsafe health claims, ever)
- STREM-affiliated events and training camps
- partner programs

Marketplace features require explicit safety review and strong moderation before launch. The marketplace cannot compromise health safety or user trust.

---

## Events And Community Revenue (Future)

- STREM Games (competitive transformation events)
- training camps and workshops
- summits and in-person events
- local and global challenge events with entry fees

---

## Monetization Principles

- No dark patterns. Pricing is transparent. Cancellation is easy.
- Clear data usage: users know what their data is used for and can opt out.
- Premium value before premium pressure: users experience meaningful value in free tier before being shown premium options.
- No unsafe health claims to drive purchases: supplement, nutrition, and coaching content must meet safety standards.
- Game mechanics are never paywalled in ways that create shame for free users: free users see progress, just not the full system.
- Seasonal exclusive medals are premium-only (V2+): a fair scarcity mechanism that rewards committed users.

---

## First Paid Gate Candidates

After retention is proven, the premium paywall should land at the point where free users have experienced the transformation loop and can clearly see what depth unlocks:

- full mission generation (all types, 1–3 per week)
- weekly narrative coaching recap
- tribe creation and admin tools
- streak XP bonuses
- missions and challenges beyond the free tier

The free tier exists to demonstrate the system works. The premium tier exists to fund making it deeper.

Payment infrastructure belongs in a later service boundary (`strem-payment-service`), not in MVP core services.
