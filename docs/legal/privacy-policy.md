# STREM Privacy Policy

```
Version:      2026-06-20
Effective:    2026-06-20
Last-updated: 2026-06-20
```

> **Plain-language summary (not a substitute for the policy below).** STREM is a
> health and performance app, so we handle sensitive data: what you train, eat, and
> how you recover, your body metrics, and — if you choose — biomarker and lab
> values. We use it to coach you, never to shame you, and we never sell it. We use
> a small set of named providers to make the app work (Anthropic for AI, plus any
> wearable you connect such as Whoop or Strava). You can see what your coach sees,
> turn data sources off, and export or delete your data at any time.

This Privacy Policy explains what STREM ("STREM", "we", "us") collects, why, how
long we keep it, who we share it with, and the rights you have. It applies to the
STREM mobile application and related services (the "Service"). It works alongside
the [Terms of Service](terms-of-service.md) and the
[Medical Disclaimer](medical-disclaimer.md).

We treat health and fitness data — including any biomarker or lab values you enter
— as **sensitive personal data** and apply heightened protection to it.

---

## 1. Data we collect

### 1.1 Data you give us

- **Account & identity:** email, authentication credentials (stored hashed by our
  auth service, never in plaintext), and the identity-first onboarding answers you
  choose (display name, identity statement, transformation goal, training level,
  preferred modalities, weekly target, nutrition preference, tribe preference,
  timezone).
- **Athlete profile & body metrics:** optional inputs you provide to improve
  coaching — height, weight trend, age band, sex (used for heart-rate / HRV norms
  and load math, never as a "look" metric), training history, personal records,
  injuries and limitations, equipment access, and dietary constraints.
- **Training, running, and nutrition logs:** workouts, sets, runs, routes, meals,
  macros, hydration, and related notes you record.
- **Recovery data:** sleep, HRV, resting heart rate, and similar recovery signals
  you record or that we ingest from a connected source.
- **Biomarker / lab values (if you enable it):** values you enter such as
  ferritin, vitamin D, lipids, glucose/HbA1c, testosterone, and similar markers.
  This is gated behind explicit consent **and** acknowledgement of the
  [Medical Disclaimer](medical-disclaimer.md), and is a data source you can revoke.
- **Content you create with the agent:** chat messages with the STREM AI Race Team,
  stated preferences, captured photos or voice notes you submit, and journal-style
  entries.
- **Tribe & social activity:** the tribes you join and your participation in
  challenges and accountability features you opt into.

### 1.2 Data from connected sources (with your authorization)

If you connect a third-party source through its OAuth flow, we receive the data you
approve and the **OAuth access and refresh tokens** needed to sync it:

- **Whoop** — recovery, sleep, HRV, strain, and related metrics.
- **Strava** — runs, routes, and activity data.

We store these **OAuth tokens encrypted at rest** and use them only to sync the
data you authorized. You can disconnect a source at any time (see §6).

### 1.3 Data we collect automatically

- **Technical & device data:** app version, device/OS type, language, timezone, and
  coarse diagnostic logs needed to operate and secure the Service.
- **Usage data:** in-app events (for example, a workout logged, a mission
  completed, a rank change) used to power progression, the weekly recap, and
  reliability — optimizing for **transformation signals**, not vanity engagement
  metrics.

We do **not** require precise location, and we do not run third-party advertising
trackers.

---

## 2. How we use your data

We use your data to:

- **Provide coaching.** Generate readiness, plan adjustments, insights, missions,
  PR detection, and (where enabled) biomarker **trend context** — always as
  estimates, never as diagnosis or prescription (see the
  [Medical Disclaimer](medical-disclaimer.md)).
- **Run the progression system.** Award XP, compute ranks and medals, and drive the
  weekly recap.
- **Power accountability features** you opt into, such as tribes and challenges.
- **Operate, secure, and improve the Service**, including debugging, preventing
  abuse, and maintaining reliability.
- **Communicate with you** about the Service and, where you allow it, send nudges
  and notifications.
- **Meet legal obligations** and enforce our [Terms of Service](terms-of-service.md).

**What your coach sees, you control.** STREM exposes a consent surface ("what your
coach sees") where you can toggle individual data sources on or off; turning a
source off removes it from coaching. We use your data to coach and support you — we
**never** use it to shame you, never sell it, and never use it for third-party
advertising.

### Legal bases (where GDPR or similar law applies)

- **Contract** — to provide the Service you asked for.
- **Consent** — for connected sources, for biomarker/lab data, and for optional
  notifications. You can withdraw consent at any time.
- **Legitimate interests** — to secure the Service and prevent abuse, balanced
  against your rights.
- **Legal obligation** — where the law requires retention or disclosure.

---

## 3. The AI provider and how prompts are handled

STREM's coaching is powered by **Anthropic** as the AI model provider. To generate a
response, we send the model the **context needed for that request** — for example,
relevant recent training, recovery, nutrition, or (if you enabled it) biomarker
context, plus your message. This is processed to produce coaching for you. We send
the minimum context required, governed by your consent toggles, and we apply
safety guardrails (no diagnosis, no prescription, no shaming, honest fallbacks when
a capability or key is unavailable).

We do not permit the AI provider to use your data to train its general models
outside the terms of our processing arrangement, and biomarker and other sensitive
data are only included when you have enabled that source.

---

## 4. Who we share data with

We share data only as described here. We do **not** sell your personal data.

- **Service providers / processors** acting on our behalf under contract:
  - **Anthropic** — AI model processing (see §3).
  - **Connected sources you authorize** — **Whoop** and **Strava** (data flows from
    them to us; we also exchange the tokens needed to sync).
  - Infrastructure, hosting, storage, and error-monitoring providers needed to run
    the Service.
- **Within STREM features you choose** — for example, the tribe members you join
  see the activity you share with that tribe. You control participation.
- **Legal and safety** — where required by law, to enforce our Terms, or to protect
  the rights, safety, and security of users and the public.
- **Business transfer** — if STREM is involved in a merger, acquisition, or asset
  sale, data may transfer as part of that transaction, subject to this Policy.

Where data is transferred across borders, we rely on appropriate safeguards (such
as standard contractual clauses) as required by applicable law.

---

## 5. Retention

We keep personal data **only as long as needed** for the purposes above:

- **Account and profile data** — for the life of your account.
- **Logs, recovery, and biomarker data** — for the life of your account so the
  agent can show trends over time, unless you delete specific entries or your
  account.
- **Connected-source OAuth tokens** — until you disconnect the source or delete
  your account, after which they are revoked and deleted.
- **Operational and security logs** — for a limited period needed for reliability,
  fraud prevention, and legal compliance, then deleted or anonymized.
- **After deletion** — when you delete your account, we delete or anonymize your
  personal data within a reasonable period, except where limited retention is
  required for legal, accounting, or security reasons (for example, residual
  backups, which expire on their normal cycle).

---

## 6. Your rights and controls

Subject to applicable law (including the GDPR for users in the EU/EEA), you have the
right to:

- **Access** the personal data we hold about you.
- **Export** your data — STREM provides an "export everything" path. *(The export
  and deletion mechanics pair with GDPR work tracked as HARDEN-09.)*
- **Correct** inaccurate data.
- **Delete** your account and personal data ("delete my data"), subject to the
  limited legal retention in §5.
- **Withdraw consent** for connected sources and biomarker data, and **toggle off**
  any data source from coaching at any time via the consent surface.
- **Object to or restrict** certain processing, and where applicable, **data
  portability**.
- **Lodge a complaint** with your local data-protection authority.

In-app, you can disconnect a connected source (which revokes and deletes its
tokens), turn off any data source, and use the export and delete controls. To
exercise any right that is not self-serve, contact us (§9). We will respond within
the timeframe the law requires.

---

## 7. Security

We protect your data with industry-standard measures: encryption in transit;
**encryption at rest for sensitive secrets, including connected-source OAuth
tokens**; hashed credentials; least-privilege access; and isolation between
services. No system is perfectly secure, but we design for the sensitivity of
health data and limit how much context any one part of the system can see.

---

## 8. Children

The Service is not directed to, and we do not knowingly collect data from, anyone
under the minimum age in §1 of the [Terms of Service](terms-of-service.md). If you
believe a child has provided us data, contact us and we will delete it.

---

## 9. Contact and changes

**Privacy questions / requests:** **privacy@strem.app**.

We may update this Policy. The `Version` and `Effective` dates in the header above
identify the current version. For **material** changes — including any change to
what we collect, how we use or share it, or your rights — we will require you to
review and accept the new version in the app, and your acceptance is recorded per
version (see [`README.md`](README.md)).

> The contact address above is a placeholder pending the production privacy
> mailbox; it does not appear in any committed configuration or secret.
