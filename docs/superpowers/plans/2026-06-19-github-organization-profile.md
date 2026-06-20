# GitHub Organization Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a concise, high-level STREM profile on the `STREM-Platform` GitHub organization page without exposing private repositories or internal implementation details.

**Architecture:** Create a dedicated public `STREM-Platform/.github` repository whose `profile/README.md` is rendered by GitHub on the organization Overview page. Keep the repository narrowly scoped to public profile content and one approved logo asset, then update only the organization name, description, and location metadata.

**Tech Stack:** GitHub organization profile repository, Git, GitHub CLI/API, Markdown, PNG

---

### Task 1: Create the local public-profile repository

**Files:**
- Create: `C:\strem-platform\.github\README.md`
- Create: `C:\strem-platform\.github\AGENTS.md`
- Create: `C:\strem-platform\.github\profile\README.md`
- Copy: `C:\strem-platform\strem-docs\assets\brand\logo.png` to `C:\strem-platform\.github\assets\strem-logo.png`

- [ ] **Step 1: Create the repository-level README**

Create `README.md` with this content:

```markdown
# STREM GitHub Organization Profile

This public repository contains the profile rendered on the
[`STREM-Platform`](https://github.com/STREM-Platform) GitHub organization page.

The canonical product, architecture, and brand documentation remains in the
private `strem-docs` repository.
```

- [ ] **Step 2: Create the repository agent boundary**

Create `AGENTS.md` with rules that permit only public Markdown and approved public brand assets, prohibit internal repository names and implementation details, and require consistency with the canonical `strem-docs` brand and MVP documents.

- [ ] **Step 3: Create the public organization profile**

Create `profile/README.md` with:

- centered approved logo
- `STREM — Never Settle.`
- one-line transformation mission
- concise explanation of what STREM is and is not
- four high-level pillars: Identity, AI Coach, Progression, Tribes
- high-level MVP description
- Bulgarian `stremezh` origin
- Bulgaria and Germany initial-market statement
- privacy-conscious positioning
- closing lines `Build the identity first.` and `Train the system, not the mood.`

Do not include private repository names, service topology, technology badges, internal status, launch dates, personal contacts, or private links.

- [ ] **Step 4: Copy the approved logo**

Run:

```powershell
Copy-Item -LiteralPath 'C:\strem-platform\strem-docs\assets\brand\logo.png' `
  -Destination 'C:\strem-platform\.github\assets\strem-logo.png'
```

Expected: `assets/strem-logo.png` exists and has the same SHA-256 hash as the source.

- [ ] **Step 5: Validate the local disclosure boundary**

Run a case-insensitive scan for:

```text
strem-mobile
strem-api-gateway
strem-auth-service
strem-user-service
strem-training-service
strem-nutrition-service
strem-community-service
strem-ai-orchestrator
FastAPI
React Native
internal status
launch date
```

Expected: no matches in the public profile repository.

### Task 2: Initialize and verify the local Git repository

**Files:**
- Create: `C:\strem-platform\.github\.git\`

- [ ] **Step 1: Initialize the repository**

Run:

```powershell
git -C C:\strem-platform\.github init -b main
```

Expected: repository initialized with branch `main`.

- [ ] **Step 2: Review the full public diff**

Run:

```powershell
git -C C:\strem-platform\.github status --short
git -C C:\strem-platform\.github diff --no-index -- NUL profile\README.md
```

Expected: only `README.md`, `AGENTS.md`, `profile/README.md`, and `assets/strem-logo.png` are present.

- [ ] **Step 3: Commit the profile**

Run:

```powershell
git -C C:\strem-platform\.github add README.md AGENTS.md profile\README.md assets\strem-logo.png
git -C C:\strem-platform\.github diff --cached --check
git -C C:\strem-platform\.github commit -m "docs: add STREM organization profile"
```

Expected: one root commit with four files and no whitespace errors.

### Task 3: Publish the public `.github` repository

**Files:**
- Remote repository: `STREM-Platform/.github`

- [ ] **Step 1: Confirm authenticated organization access**

Run:

```powershell
gh auth status
gh api user/memberships/orgs/STREM-Platform
```

Expected: authenticated GitHub user has active organization membership with sufficient repository administration permission.

- [ ] **Step 2: Create the public repository**

Run:

```powershell
gh repo create STREM-Platform/.github `
  --public `
  --description "Public profile for the STREM GitHub organization." `
  --source C:\strem-platform\.github `
  --remote origin `
  --push
```

Expected: `https://github.com/STREM-Platform/.github` exists publicly and `main` is pushed.

- [ ] **Step 3: Verify repository visibility and files**

Run:

```powershell
gh repo view STREM-Platform/.github --json nameWithOwner,visibility,defaultBranchRef,url
gh api repos/STREM-Platform/.github/contents/profile/README.md --jq '.path'
gh api repos/STREM-Platform/.github/contents/assets/strem-logo.png --jq '.path'
```

Expected:

- visibility is `PUBLIC`
- default branch is `main`
- both public files resolve through the GitHub API

### Task 4: Update organization metadata

**Files:**
- GitHub organization settings: `STREM-Platform`

- [ ] **Step 1: Update approved metadata only**

Run:

```powershell
gh api --method PATCH orgs/STREM-Platform `
  -f name='STREM' `
  -f description='AI-powered transformation system for disciplined growth.' `
  -f location='Bulgaria · Germany' `
  -f blog='' `
  -f email=''
```

Expected: GitHub returns the organization with the approved name, description, and location; website and email remain empty.

- [ ] **Step 2: Verify public organization metadata**

Run:

```powershell
gh api orgs/STREM-Platform --jq '{name,description,location,blog,email,html_url}'
```

Expected:

```json
{
  "name": "STREM",
  "description": "AI-powered transformation system for disciplined growth.",
  "location": "Bulgaria · Germany",
  "blog": "",
  "email": null,
  "html_url": "https://github.com/STREM-Platform"
}
```

### Task 5: Verify the rendered public organization page

**Files:**
- Public page: `https://github.com/STREM-Platform`

- [ ] **Step 1: Verify unauthenticated public rendering**

Open `https://github.com/STREM-Platform` and confirm:

- the onboarding checklist is replaced by the STREM profile
- the logo renders
- the mission and four pillars appear
- no private repository names appear
- organization description and location appear

- [ ] **Step 2: Verify no existing visibility changed**

Compare the organization repository visibility state before and after publication.

Expected: only `STREM-Platform/.github` is public; all pre-existing repositories retain their prior visibility.

- [ ] **Step 3: Record final evidence**

Capture:

- public organization URL
- public `.github` repository URL
- root commit SHA
- API output showing repository visibility
- API output showing organization metadata
