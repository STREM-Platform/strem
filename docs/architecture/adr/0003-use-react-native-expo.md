# ADR 0003: Use React Native And Expo For Mobile

## Status

Accepted

## Context

STREM is mobile-first. The trail Race Mission depends on fast check-ins, field access to the preparation plan and Race Lab, connected-source authorization, calendar handoff, and explainable AI decisions. The team needs one mobile codebase for iOS and Android.

## Decision

Use React Native, Expo, and TypeScript for `strem-mobile`.

Next.js web, admin, and coach dashboards are future-phase repositories and should not be created for MVP foundation work.

## Consequences

Benefits:

- one mobile codebase
- faster iteration
- strong ecosystem
- easier AI-agent contribution with TypeScript
- Expo accelerates development and testing

Costs:

- native integrations may eventually require custom native modules
- advanced wearable integrations may need careful architecture later

## Guardrail

Do not build web/admin/coach dashboards before MVP retention is validated or explicitly approved.
