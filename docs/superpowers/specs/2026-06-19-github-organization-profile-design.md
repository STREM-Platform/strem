# GitHub Organization Profile Design

## Objective

Replace the empty `STREM-Platform` GitHub organization overview with a concise public profile that communicates STREM's mission, product pillars, cultural origin, and disciplined engineering posture.

The profile must make the organization feel intentional and credible without exposing private repositories, internal architecture, implementation status, roadmaps, or founder contact details.

## Current State

As of June 19, 2026, the GitHub organization has:

- an approved STREM logo
- no public organization description
- no public location
- no website
- no public repositories
- no public `.github/profile/README.md`

GitHub therefore displays its organization onboarding checklist instead of a branded overview.

## Approved Direction

Use a balanced product-and-engineering profile.

The profile should lead with the transformation mission and product differentiation. Engineering credibility should come from precise language, clear scope, and privacy-conscious positioning rather than repository lists, architecture diagrams, technology badges, or implementation claims.

## Profile Structure

The public `profile/README.md` will contain these sections in order:

1. **Brand header**
   - approved STREM logo
   - `STREM — Never Settle.`
   - one-line transformation mission

2. **What STREM is**
   - a short explanation of STREM as an AI-powered transformation system
   - explicit distinction from generic fitness trackers, calorie counters, chatbots, and social feeds

3. **Four product pillars**
   - Identity
   - AI Coach
   - Progression
   - Tribes

4. **High-level MVP**
   - identity-first onboarding
   - training, running, and nutrition logging
   - adaptive AI guidance and missions
   - disciplined progression
   - small accountability tribes

5. **Origin and operating principles**
   - inspired by the Bulgarian word `stremezh`
   - Bulgaria and Germany as the initial markets
   - European, privacy-conscious, human-centered positioning

6. **Closing brand line**
   - `Build the identity first.`
   - `Train the system, not the mood.`

## Proposed Public Copy

### Header

**STREM — Never Settle.**

The AI-powered transformation system for becoming your strongest self.

### Introduction

STREM turns ambition into a disciplined daily system. It combines identity-first coaching, training and nutrition logs, meaningful progression, and small accountability tribes for ambitious people and hybrid athletes.

STREM is not another fitness tracker, calorie counter, generic AI chatbot, or social feed. It is built to help people develop stronger identities, adaptable routines, and lasting standards.

### Product Pillars

#### Identity

Build the person, not only the metrics. STREM connects daily actions to the identity a person is working to earn.

#### AI Coach

Reduce decision fatigue through adaptive guidance and missions that respond to goals, consistency, recovery, and real-life constraints.

#### Progression

Turn disciplined action into visible proof through meaningful milestones, ranks, medals, and progress.

#### Tribes

Create accountability through small, focused groups built for belonging, contribution, and shared momentum rather than public popularity.

### MVP Description

The first STREM experience brings together identity-first onboarding, training and running logs, nutrition logging, adaptive AI guidance, disciplined progression, and small accountability tribes.

### Origin

The name is inspired by the Bulgarian word `stremezh`: striving, ambition, resilience, upward movement, and constant growth.

STREM begins in Bulgaria and Germany with a global-ready, privacy-conscious foundation.

### Closing

**Build the identity first.**

**Train the system, not the mood.**

## Visual Direction

- Use a premium dark presentation that remains readable in GitHub light and dark modes.
- Use the existing approved STREM logo without stretching, recoloring, or cropping it.
- Keep Bulgarian green and red accents restrained.
- Prefer native Markdown structure over custom HTML.
- Use compact visual separators and headings.
- Avoid glow-heavy banners, animated assets, visitor counters, GitHub statistics cards, excessive badges, and decorative clutter.
- Do not introduce new logos, slogans, colors, or brand claims.

The profile should feel controlled, exact, and premium rather than promotional or crowded.

## Organization Metadata

Set the public GitHub organization fields to:

- **Name:** `STREM`
- **Description:** `AI-powered transformation system for disciplined growth.`
- **Location:** `Bulgaria · Germany`
- **Website:** leave empty until an official STREM website exists
- **Email:** leave empty
- **Social links:** leave empty

## Repository and File Design

Create the public organization repository:

```text
STREM-Platform/.github
├── README.md
├── AGENTS.md
├── profile/
│   └── README.md
└── assets/
    └── strem-logo.png
```

Responsibilities:

- `profile/README.md` is the public organization overview rendered by GitHub.
- `assets/strem-logo.png` is the approved public logo used by the profile.
- `README.md` explains the narrow purpose of the repository.
- `AGENTS.md` protects the public-content boundary for future contributors and AI agents.

The repository must not become a copy of `strem-docs` or a general documentation repository.

## Public Disclosure Boundary

The profile may disclose:

- approved brand positioning
- the four transformation pillars
- approved high-level MVP capabilities
- Bulgarian origin
- Bulgaria and Germany as initial markets
- privacy-conscious and human-centered principles

The profile must not disclose:

- private repository names
- service topology or architecture diagrams
- internal implementation status
- unreleased screenshots
- private roadmap details
- issue or project-board links
- infrastructure or vendor details
- secrets, credentials, internal URLs, or operational data
- founder email or other personal contact details
- unsupported launch dates, availability claims, user counts, partnerships, or performance claims

## GitHub Visibility Rules

- The `.github` repository must be public for the profile to appear to visitors.
- Existing product, service, infrastructure, contract, intelligence, and documentation repositories retain their current visibility.
- Creating the public profile does not authorize changing any other repository's visibility.
- No repositories should be pinned until a separate decision identifies content suitable for public access.

## Content Ownership

- `strem-docs` remains the canonical source of truth for product and brand language.
- The `.github` repository owns only the rendered public organization profile and its public assets.
- Future profile changes must remain consistent with:
  - `vision/brand-identity.md`
  - `vision/slogan.md`
  - `vision/bulgarian-heritage.md`
  - `product/mvp-scope.md`

## Validation

Before publication:

1. Confirm the profile uses only approved public copy and assets.
2. Confirm no private repository names or internal details appear.
3. Preview the Markdown in GitHub-compatible light and dark themes.
4. Verify the logo loads from the public `.github` repository.
5. Verify heading hierarchy, line lengths, and mobile readability.
6. Verify all links resolve publicly without authentication.
7. Verify the organization overview replaces GitHub's empty onboarding presentation.
8. Confirm all existing repositories retain their prior visibility.

## Success Criteria

The work is complete when:

- `github.com/STREM-Platform` shows the branded profile to unauthenticated visitors
- the organization description and location are populated
- the profile clearly explains STREM within the first screen
- the four product pillars are understandable without internal context
- no private repository names or internal implementation details are exposed
- the page remains concise, readable, and consistent with the STREM brand

## Out of Scope

- making product repositories public
- creating a marketing website
- publishing technical architecture
- pinning repositories
- adding contribution or hiring calls to action
- publishing launch dates or product availability
- creating new brand assets
- adding CI/CD, application code, APIs, or infrastructure
