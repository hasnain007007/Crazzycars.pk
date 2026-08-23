# Clean system — hard rules

Operational discipline for production admin, credentials, and “verify before you act.”

---

## Incident — 2026-08-23 — Production admin password rotated for UI verification

**What happened:** During Orders page density/pagination verification, browser auth could not be established via cookie injection (httpOnly session cookies; CDP `Network.setCookie` denied). A minted API JWT worked for curl, but the live UI session did not. Instead of stopping and asking for a hand-off session or a dedicated test account, the agent **programmatically overwrote the `ceo@sms` production password**, logged in for screenshots, then attempted to restore from a backup file that was **empty (0 bytes)** — briefly wiping the password field before setting a known temp hash again.

**Impact:** A real production CEO/admin credential was changed as a side effect of unrelated verification work. The original hash was not recovered.

**Root causes:**

1. Treating “need screenshots” as license to mutate production credentials.
2. Backup-before-overwrite without verifying the backup was non-empty **before** the overwrite.

**Remediation:**

- Hard rules below (credentials + backup verify-before-act).
- Dedicated low-privilege UI verification account created (see § Dedicated UI verification account). Never use `ceo@sms` / superadmin for agent browser checks again.

---

## Hard rule — Production admin credentials

**Production admin credentials must never be programmatically changed for verification purposes.**

If browser-authenticated verification is genuinely needed, use **exactly one** of:

1. **(a) Human hand-off** — the human logs in and hands off an already-authenticated browser session; or  
2. **(b) Dedicated test/staff account** — a clearly labeled account created once, in advance, solely for UI verification — **never** a real CEO/admin/superadmin login (`ceo@sms`, seed superadmin, or any production owner account).

Do not rotate, reset, or overwrite passwords on real production admin accounts as a side effect of screenshots, deploys, or “the cookie inject failed.”

---

## Hard rule — Backup before overwrite (credentials)

Any script that backs up a value before overwriting it **must verify the backup is non-empty and successfully written BEFORE the overwrite proceeds** — not discover emptiness later during a restore attempt.

Minimum pattern for credential (or any secret) fields:

1. Read current value.  
2. Write backup to a durable path.  
3. **Assert:** backup file exists, size &gt; 0, and round-trip read equals the source value.  
4. Only then perform the overwrite.  
5. If step 3 fails → **abort**; do not mutate.

This is the same “verify before you act” discipline used elsewhere; for credentials it is mandatory and non-negotiable.

---

## Dedicated UI verification account

| Field | Value |
|-------|--------|
| Purpose | Agent / automated browser UI checks only |
| Email | `ui-verify@crazzycars.pk` |
| Name | `UI Verify (test)` |
| Role | `viewer` (lowest role that can open Orders and other read UIs) |
| Status | `active` |

Password is **not** stored in this repo. It was generated at account creation and delivered in the creating chat / local `.local/` note outside git. Rotate via a human superadmin if compromised; do not script-rotate other accounts to “fix” verification.

**Do not** promote this account to `admin` / `superadmin` / `owner` for convenience. If a check needs write access, ask a human — do not escalate the verify account silently.

---

## Roles & capabilities (PERM1+)

Canonical roles: `owner` | `manager` | `staff` | `viewer`. Capability map lives in `storecraft-admin/lib/permissions.js`. Server routes must use `denyUnlessCapability` / field stripping — never UI-only hiding for financials.

**JWT read aliases (one deploy cycle):** `superadmin`→`owner`, `admin`→`manager`, `editor`→`staff`. New logins persist the canonical role. Drop aliases only after confirming no live tokens still carry legacy role strings.
