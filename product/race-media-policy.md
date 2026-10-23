# Race Media Rights And Attribution Policy

**Status:** Active product and design policy  
**Decision date:** 2026-09-21  
**Applies to:** event photography, athlete uploads, commissioned media, stock media, generated visual fallbacks, maps, and event marks displayed by STREM  
**Review gate:** Human legal/privacy review is required before implementing rights ingestion, public sharing, or organizer media agreements

## Policy Outcome

STREM may create a cinematic race experience only when it can prove that it has the right to display each asset in the intended product, territory, and commercial context.

No race website, social account, search result, registration platform, or map image may be scraped or copied because it is publicly visible. Attribution does not replace a license. An event name or public registration does not grant rights to the event's photos, logo, maps, or participant likenesses.

This policy defines product requirements, not legal advice. Any ambiguous license, organizer agreement, personality right, trademark use, or commercial campaign requires human legal review before publication.

## Non-Negotiable Rules

1. Every displayed asset has an active rights record before it reaches an athlete.
2. `Official event media` means both the event identity and the asset use have been verified. It is never inferred from visual similarity.
3. Athlete-owned media is private to that athlete unless separate consent explicitly permits broader use.
4. Generated imagery may be abstract atmosphere only. It cannot depict or be labelled as the actual race, course, organizer, athlete, or race-day conditions.
5. Credits, map attribution, license links, and provider marks remain visible where their terms require them.
6. Expired, disputed, or revoked media is disabled immediately and replaced with a safe fallback without breaking the Race Mission.
7. No media is required for a critical decision. Race identity, course facts, risks, and actions remain available in text and structured data.

## Acquisition Hierarchy

### From a race website to a visual Race Mission

The founder-requested workflow (2026-10-11, `strem-docs#24`) begins with a canonical
organizer URL and the exact edition/year and distance. A source link is not an
import permission or an official-status check. In the first slice, an authorized
curator reviews supplied sources/assets; arbitrary URL fetching and automatic
OpenGraph-image publication are not approved.

Keep three independent tracks:

- **Facts:** edition-specific values, source reference, checked date, conflicts and
  athlete confirmation. Never silently replace athlete-entered facts.
- **Photography:** licensed originals and display variants, verified rights,
  accurate event association, credit, expiry and takedown. Organizer permission
  must cover the photographer's rights where relevant.
- **Course:** authorized GPX and its versioned geometry; draw it on a separately
  approved basemap. A screenshot of the website's map is not a substitute.

The source review must catch wrong-year photographs, a different race distance,
superseded GPX and unsupported official claims. Mission and Race Lab should show
where information came from and retain useful geometry/text when media is absent.
Public sharing, arbitrary crawling and importing another platform's embedded map
remain outside this slice. The proposed metadata/storage owners and deletion
behavior in docs #24 require review before implementation.

### Preferred sources

Use the highest trustworthy source available:

1. **Organizer or official photographer agreement.** Written permission or license identifies the event, assets, commercial product use, territory, period, required credit, and whether `official` presentation is allowed.
2. **Athlete-owned upload.** The athlete confirms ownership or permission and chooses mission-only use. Faces, minors, bibs, location metadata, and other people's rights still require care.
3. **Commissioned STREM media.** Contract assigns or licenses the required commercial rights and records releases where people, private property, or protected marks appear.
4. **Licensed stock.** The stock license permits the exact use. The image is labelled `Trail running atmosphere` or equivalent and is never tied to the event as fact.
5. **Generated abstract fallback.** Code-native topography, elevation geometry, gradients, texture, or a clearly non-documentary generated landscape. The interface labels it as an illustration when a user could otherwise infer a real place.
6. **No image.** A strong type, color, and course-geometry fallback is always acceptable.

If a source cannot produce enough evidence for its level, move down the hierarchy. Do not relax the proof standard to preserve visual impact.

## Rights Decision Tree

```text
Can the owner and source be identified?
  No -> reject the asset.
  Yes
    Is there written permission or a license for this commercial product use?
      No -> reject the asset.
      Yes
        Are territory, expiry, attribution, and modification terms known?
          No -> hold for human review.
          Yes
            Are people, minors, logos, artworks, private property, or endorsement implied?
              Yes -> verify releases/permissions or use a safer crop/asset.
              No
                May it be presented as this official event?
                  Yes -> mark official only after organizer verification.
                  No -> label as atmosphere, athlete media, or illustration.
```

## Source Rules

### Organizer or official photographer

Required evidence:

- identity and authority of the grantor;
- list or stable identifier for licensed assets;
- permitted product and marketing contexts;
- commercial-use permission;
- allowed territories and platforms;
- start date and expiry or perpetual term;
- allowed cropping, overlays, and transformations;
- required credit and links;
- event logo and `official` designation permission, if applicable;
- takedown and contact path.

An organizer may control an event mark without controlling a photographer's copyright. The rights record must identify both where necessary.

### Athlete-owned upload

The upload flow must:

- explain that the athlete should upload only media they own or may use;
- default to private Race Mission use;
- avoid a preselected marketing or organizer-sharing consent;
- record the consent version and timestamp;
- strip embedded EXIF location and device metadata from delivery variants unless specifically needed and consented;
- allow deletion without deleting required audit evidence of prior consent;
- warn when the image contains other identifiable people or minors;
- provide a non-media path through every task.

The original is protected as personal data. Public sharing, AI training, promotional use, or organizer access each require separate, specific consent and are out of the MVP unless separately approved.

### Commissioned media

The contract must cover copyright ownership or license, model and property releases where needed, event/organizer permissions, editing, derivatives, commercial product and marketing use, territories, term, credit, exclusivity if any, and takedown obligations. Store signed proof outside the public delivery object and reference it by controlled identifier.

### Licensed stock

Stock is useful for atmosphere, onboarding, and a fallback hero. It is not proof of an event, surface, weather, aid station, or participant.

- Record the provider, asset page, contributor, license snapshot or version, download date, and required attribution.
- Review visible people, race bibs, brands, logos, artworks, private property, and the possibility of implied endorsement.
- Do not use a generic runner image beside an event name in a way that suggests the person participated in or endorses that event.
- Follow API-specific terms in addition to the general license. For example, Unsplash API use requires photographer and Unsplash attribution with links; Pexels encourages contributor credit and may require provider/contributor attribution for some API access levels.

### Openly licensed photo search (Race OS, 2026-10-23)

Implemented on the `issue26-race-os` branches ([ADR 0008](../architecture/adr/0008-race-os-layers-and-race-engine.md));
not released. When an athlete sets up a race, STREM offers photos of the event or its
location from Wikimedia Commons and Openverse through their public APIs — never by
scraping a race site or search engine.

- Only openly licensed images (CC0, public domain, CC BY, CC BY-SA); NoDerivatives
  licences are excluded because hero crops can count as adaptations.
- The chosen cover stores creator, licence, licence URL, source page and provider,
  and every display shows the credit.
- `depicts` defaults to `atmosphere`; only the athlete can mark a photo as showing
  the race, and STREM never labels it official event media.
- The athlete can skip the photo; a code-native topographic visual replaces it.

Before release: legal review of ShareAlike and attribution in the app (cropped hero
display, credits on small screens), and a takedown path for a reported cover.

### Generated and code-native visuals

Allowed:

- non-photoreal topographic texture;
- abstract elevation silhouette derived from the athlete's course data;
- restrained color and grain fields;
- a visibly illustrative mountain atmosphere marked `Illustration` when context could confuse it with a real location.

Prohibited:

- a generated `photo` presented as race-day documentation;
- a fictional organizer logo, sponsor mark, route marker, race bib, aid station, or athlete;
- a generated likeness of an identifiable person;
- a visual that implies current weather, trail condition, crowd size, safety, or accessibility.

## `EventMedia` Contract Proposal

The shared-contract review should encode the following product fields. Names may change to match repository conventions, but no semantic category may be dropped without an explicit decision.

| Field | Type or values | Requirement |
|---|---|---|
| `id` | opaque identifier | Required |
| `event_id` | event reference | Required for event media |
| `mission_id` | mission reference | Required for athlete-private media; optional otherwise |
| `media_kind` | `photo`, `video`, `illustration`, `course_render`, `logo` | Required |
| `usage_role` | `hero`, `course`, `gallery`, `athlete`, `atmosphere`, `mark` | Required |
| `origin` | `organizer`, `athlete`, `commissioned`, `stock`, `generated`, `code_native` | Required |
| `official_status` | `verified_official`, `not_official`, `pending_review` | Required; pending is never publicly labelled official |
| `asset_url` | controlled delivery URL | Required for raster/video media |
| `variants` | width, height, format, URL, byte size | Required for responsive delivery |
| `source_url` | canonical source page | Required except private upload or code-native visual |
| `owner_name` | copyright or rights owner | Required |
| `creator_name` | photographer/artist | Required when known or contractually required |
| `license_name` | license/agreement name | Required |
| `license_version` | version or snapshot date | Required for standard licenses |
| `rights_basis` | agreement, ownership attestation, assignment, standard license | Required |
| `rights_proof_ref` | protected evidence reference | Required; not exposed as a public file path |
| `commercial_use` | boolean | Must be true for product display |
| `allowed_contexts` | product, transactional communication, organic marketing, paid marketing | Required |
| `territories` | country/region set or worldwide | Required |
| `valid_from` | timestamp | Required |
| `expires_at` | timestamp or null only when genuinely perpetual | Required semantic |
| `modification_rules` | crop, overlay, color, derivative permissions | Required |
| `attribution_required` | boolean | Required |
| `credit_text` | display-ready credit | Required when attribution is required |
| `credit_url` | safe external URL | Required when the terms require a link |
| `provider_credit` | provider name and link | Required for applicable stock/API use |
| `alt_text` | purposeful description | Required for meaningful media; empty only when explicitly decorative |
| `focal_point` | normalized x/y | Required for photography used responsively |
| `content_flags` | people, minors, brands, bibs, private property, sensitive location | Required review result |
| `consent_ref` | protected consent/release reference | Required when applicable |
| `status` | `draft`, `active`, `expired`, `disabled`, `takedown` | Required |
| `reviewed_by` | reviewer identifier | Required before active |
| `reviewed_at` | timestamp | Required before active |
| `created_at`, `updated_at` | timestamps | Required |

Do not expose internal agreement documents, personal contact details, or consent evidence in the athlete-facing payload. The client receives only fields needed for display, labelling, attribution, state handling, and expiry.

## Display And Attribution

### Event hero

- `Verified official` may appear only for `official_status = verified_official`.
- `Athlete photo` appears for athlete-owned media when the origin matters.
- Stock and generic commissioned images show `Trail running atmosphere` in the immediate composition, not only in a hidden legal sheet.
- Generated visuals show `Illustration` when photorealistic or place-like.
- Required creator/provider credit remains readable over the image or in a persistent adjacent credit control. One tap/click opens the full credit and source.

### Gallery and detail

Each item retains its own credit and status; a gallery-wide credit is insufficient when assets have different owners or terms. External links are validated and opened with platform-safe behavior.

### Maps

Map tiles, static maps, terrain layers, and geocoding results follow the provider's current display, attribution, caching, and export terms. Provider attribution cannot be cropped, recolored into illegibility, obscured by navigation, or removed in screenshots generated by STREM. GPX geometry and STREM's own elevation rendering remain separate from third-party map imagery.

## Operational Workflow

1. **Ingest:** create a draft record; quarantine the original from public delivery.
2. **Document:** capture source, owner, license, contexts, territory, expiry, credit, modifications, flags, and proof.
3. **Review:** a human checks the rights record, visual content, implied endorsement, crop, alt text, and official status.
4. **Transform:** create responsive variants only within modification rights; strip unnecessary metadata.
5. **Activate:** publish only when commercial use is true, the current context and territory are allowed, the start date is reached, and status is active.
6. **Monitor:** notify operators before expiry and prevent new use after expiry.
7. **Disable:** switch to a safe fallback immediately for expiry, dispute, revocation, missing attribution, or takedown.
8. **Audit:** retain the minimum rights and action history required by policy and law, separate from public assets.

There is no `publish now, document later` path.

## Runtime Selection And Fallback

For a requested usage role, the service selects only active media that matches the mission/event, allowed context, current territory, and current time.

Priority:

1. verified official event asset;
2. athlete-private asset for that athlete and mission;
3. licensed commissioned event or region asset, accurately labelled;
4. licensed stock atmosphere, accurately labelled;
5. code-native or generated abstract fallback;
6. typography and color only.

The client must be able to apply steps 5-6 when an asset fails after selection. It must not reuse a previously cached expired asset simply because the network is offline.

## Takedown And Incident Response

Anyone reporting a rights, privacy, safety, or attribution concern receives a trackable support path. On a credible report:

- disable delivery first when continued display creates material risk;
- preserve the report, asset identifier, rights record, and action log with restricted access;
- replace the asset across active surfaces and caches;
- notify the rights owner, organizer, athlete, or provider as the agreement requires;
- restore only after documented human review;
- record the outcome and prevent the same asset from being re-imported accidentally.

Emergency disablement must not require a mobile release.

## Media Acceptance Checklist

- [ ] Owner and canonical source are known.
- [ ] Commercial product use is permitted.
- [ ] Display context, territory, start, and expiry are valid.
- [ ] Crop, overlay, transformation, and derivative permissions are recorded.
- [ ] Official-event status is explicitly verified or explicitly absent.
- [ ] People, minors, brands, artworks, property, and endorsement risks were reviewed.
- [ ] Consent or releases are linked when applicable.
- [ ] Credit and provider links match the current terms.
- [ ] Alt text and focal point work at compact and wide crops.
- [ ] Responsive variants respect the license and performance budget.
- [ ] Expiry and takedown produce a tested non-breaking fallback.
- [ ] The UI label cannot imply that atmosphere or illustration is the actual event.

## References

- [Unsplash license and commercial use](https://help.unsplash.com/en/articles/2612315-can-i-use-unsplash-images-for-personal-or-commercial-projects)
- [Unsplash API attribution guideline](https://help.unsplash.com/en/articles/2511315-guideline-attribution)
- [Unsplash API guidelines](https://help.unsplash.com/en/collections/1451694-api-guidelines)
- [Pexels commercial-use guidance](https://help.pexels.com/hc/en-us/articles/360042295214-Can-I-use-the-photos-and-videos-for-a-commercial-project)
- [Pexels license summary](https://help.pexels.com/hc/en-us/articles/360042295174-What-is-the-license-of-the-photos-and-videos-on-Pexels)
- [Pexels usage rules](https://help.pexels.com/hc/en-us/articles/360042332714-What-are-the-rules-for-using-Pexels-photos-or-videos)
