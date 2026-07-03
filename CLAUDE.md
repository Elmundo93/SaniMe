# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product context

SaniMe is a mobile app (Expo/React Native) that digitizes the German "Hilfsmittelversorgung" process (medical supply procurement via prescription + statutory health insurance). The customer just photographs documents (Rezept, Krankenkassenkarte); the app/backend handles OCR, product matching, insurance submission, and order tracking. There is no backend in this repo yet — all data (OCR results, product catalog, order history) is currently mocked in the Zustand stores under `store/`.

Product/UX rules that should inform any feature work:
- One task and one primary CTA per screen; always allow Back/Forward with visible progress.
- Automate over form input — never ask the user for information that could be derived (OCR, defaults, recommendations).
- Every OCR/derived field must stay user-editable; OCR output is never final.
- Error messages must state a concrete next step for the user (German, e.g. "Wir konnten dein Rezept nicht vollständig erkennen. Bitte überprüfe die markierten Felder." — not "OCR Error").
- Health/insurance data (prescription photos, diagnoses, insurance IDs) is highest-sensitivity: never log it, send it to analytics, or store it unencrypted.
- New UI must meet WCAG 2.1 AA: 44×44 touch targets, screen reader labels, logical focus order, sufficient contrast, Dynamic Type support.
- The product catalog (`Produkt` type) is a placeholder during development — never hardcode real manufacturer/pricing/Hilfsmittelnummer data as if it were production data.

## Commands

```bash
npm run start       # expo start — Metro bundler, scan QR or press i/a for simulator
npm run ios         # expo run:ios — build & launch native iOS
npm run android     # expo run:android — build & launch native Android
npm run lint        # eslint .
npm run typecheck   # tsc --noEmit
npm run test        # jest (jest-expo preset) — currently only lib/ocr/*.test.ts
```

`npm run lint` requires `.eslintrc.js` (extends `expo`) at the repo root — this file didn't exist before and lint silently failed with no config found; it's checked in now, don't delete it.

Jest is configured (`jest.config.js`, `jest-expo` preset) with a `test` script; run with `npm run test`. Tests are co-located next to source as `*.test.ts` — currently only under `lib/ocr/` (unit tests for the parsers/validators/mapper). No integration/E2E/accessibility test automation exists yet — see "Manual/interactive testing" below for that.

Always run `npm run typecheck` and `npm run lint` after changes; also run `npm run test` when touching `lib/ocr/`. This is currently the only automated verification available beyond that one test suite — most of the app has no automated coverage. For interactive verification (actually tapping through screens), see "Manual/interactive testing" below.

## Architecture

**Stack**: Expo (SDK 54) + expo-router (file-based routing, typed routes enabled) + React Native 0.81 + NativeWind (Tailwind for RN, see `tailwind.config.js`/`global.css`) + Zustand for state + AsyncStorage for persistence. Path alias `@/*` maps to repo root (`tsconfig.json`), though existing code consistently uses relative imports (`../../types`) instead — match that convention, not the alias.

The full onboarding-to-checkout flow (Willkommen → Leistungsübersicht/consent → Rezeptaufnahme → Rezeptprüfung → Krankenkassenkarte → Datenprüfung → Versorgungsauswahl → Termin → Zusammenfassung → Checkout → Dashboard) is implemented end-to-end as an explicit **state machine**, not a hardcoded screen chain. Read this section together with `store/onboardingMachine.ts` before touching any onboarding/scan screen — almost everything here is driven by that one file.

### State machine (`store/onboardingMachine.ts` + `store/onboardingStore.ts`)

- **`store/onboardingMachine.ts`** — pure functions only, no React/Zustand/AsyncStorage import (isolated, easy to reason about/test in isolation):
  - `OnboardingStatus` — the 12-state union (`WILLKOMMEN`, `LEISTUNGSUEBERSICHT`, `REZEPT_AUFNAHME`, `REZEPT_PRUEFUNG`, `KRANKENKASSE_AUFNAHME`, `DATENPRUEFUNG`, `VERSORGUNGSAUSWAHL`, `TERMINPLANUNG`, `ZUSAMMENFASSUNG`, `CHECKOUT`, `CHECKOUT_FEHLGESCHLAGEN`, `ABGESCHLOSSEN`), defined in `types/index.ts` alongside `OnboardingSession`.
  - `OnboardingEvent` — the event union (`WEITER`, `ZURUECK`, `AGB_AKZEPTIERT`, `REZEPT_OCR_ABGESCHLOSSEN`, `FELD_KORRIGIERT`, `SUPPLY_AUSGEWAEHLT`, `ZAHLUNG_ERFOLGREICH`, …).
  - `TRANSITIONS` — the actual state machine: an array of `{ from, event, to, guard? }` rows. **Every legal navigation edge, forward and backward, is an explicit row** — there is no implicit "any state can go back one step" rule and no generic fallback. If a screen dispatches an event with no matching `(from, event)` row, `transition()` returns `{ ok: false }` and nothing happens. When adding a new screen/step, you must add its rows here, including the `ZURUECK` row — forgetting it means the guard hook will bounce the user right back the moment they try to navigate away (this exact bug shipped twice during initial build, on the Rezept- and Krankenkasse-camera screens, before the rows were added).
  - `transition(session, event)` — the reducer; validates the row exists, checks its `guard` (e.g. required-fields-present before advancing), then applies `applyEventData` (a plain `switch` merging the event's payload into the relevant session fields) and returns the new session with `status` updated.
  - `hatPflichtfelderRezept` / `hatPflichtfelderKomplett` — exported guard predicates, reused by `review.tsx`/`datenpruefung.tsx` to drive the "Weiter" button's disabled state, so the UI signal and the actual transition guard can never drift apart.
  - `erstelleLeereSession(id)` — the initial `OnboardingSession` factory.
- **`store/onboardingStore.ts`** — the Zustand store, mirrors `authStore.ts`'s manual-AsyncStorage pattern under key `sanime_onboarding_session`:
  - `dispatch(event)` is the single choke point every screen calls. It runs `transition()`, and only on `{ ok: true }` does it (a) write to AsyncStorage, (b) update the Zustand state, (c) fire the matching analytics event via an internal `emitAnalyticsForTransition` mapping — **persistence-after-every-step and analytics instrumentation are structural side effects of `dispatch`, not something a screen author can forget to call.**
  - `STATUS_META: Record<OnboardingStatus, { route, schritt }>` — the *one* table mapping machine status to an expo-router path and a 1–11 step number. Every redirect and every `StepCounter` in the app reads this table; there is no other place a status maps to a route.
  - `starten()` — creates a fresh session or resumes an existing unfinished one (called once, from `app/onboarding/index.tsx`'s own CTA).
  - `abschliessen()` — called only after a successful Checkout payment: builds the real `Versorgung` via `versorgungStore.baueVersorgungAusSession()`, calls `authStore.setBenutzer()`/`onboardingAbschliessen()` if not already logged in, clears the session from AsyncStorage. **A `Versorgung` record does not exist before this point** — matches the product rule that the binding order is only created after checkout succeeds.
- **`hooks/useOnboardingGuard.ts`** — called by every onboarding/scan screen with its own expected `OnboardingStatus` (or an array, e.g. `checkout.tsx` accepts `['CHECKOUT', 'CHECKOUT_FEHLGESCHLAGEN']`). On mismatch it `router.replace()`s to `STATUS_META[session.status].route`. This is what makes wrong-screen navigation — deep links, swipe-back, app relaunch mid-flow after a crash — structurally impossible instead of incidentally correct. Screens render `<OnboardingLoadingView />` while `!ready`.

### Routing (`app/`)

- `app/_layout.tsx` — root `Stack`; awaits **both** `useAuthStore().laden()` and `useOnboardingStore().laden()` (in parallel) before hiding the splash screen. Declares route groups `onboarding`, `(app)`, and `scan` (full-screen modal). There is no `auth` route group — see below.
- `app/index.tsx` — entry gate: splash, then if `!onboardingAbgeschlossen` — redirect to `STATUS_META[session.status].route` if an in-progress `OnboardingSession` exists (mid-flow resume after a crash/close), else `/onboarding`; else always `/(app)/dashboard`, regardless of `benutzer` — there is no forced-login gate. A `benutzer === null` visitor (never onboarded, or logged out via Einstellungen) lands on the dashboard's guest empty state; identity is only re-established later, if at all, via a Krankenkassenkarte scan matched against `lib/mockKundenArchiv.ts` (see `app/scan/krankenkasse.tsx`'s `pruefeArchivTreffer`). There is intentionally no manual "log back in" screen — `app/auth/otp.tsx` was deleted because the archive-match scan is now the single identity-recovery path; don't recreate an OTP re-login screen without first checking whether that decision has changed.
- `app/onboarding/` — `index.tsx` (Willkommen; no store reads except calling `starten()`+`dispatch(WEITER)` on its own CTA) → `leistungsuebersicht.tsx` (Leistungsübersicht: **one** machine status with 3 *local* substeps — process visual, reassurance animation, AGB/Datenschutz consent — the substep counter is component `useState`, not machine state, since only the consent checkboxes carry real data; those dispatch `AGB_AKZEPTIERT`/`DATENSCHUTZ_AKZEPTIERT` immediately per tap, "Weiter" is gated on both being accepted) → `agb.tsx` / `datenschutz-text.tsx` (static legal-text screens, reachable any time via links, not part of the state machine).
- `app/(app)/` — reachable by guests and logged-in users alike (see `app/index.tsx` above); bottom tabs (`dashboard`, `einstellungen`) — note the custom `PremiumTabBar` in `_layout.tsx` requires `Tabs.Screen` names to match the *exact* file-based route key (`dashboard/index`, not `dashboard/index.tsx`'s folder name `dashboard`) or the title/icon silently never attach and the raw route name leaks into the tab label; `options.href: null` (used to keep `dashboard/[id]` out of the tab bar) only works with expo-router's default tab bar, so the custom bar filters visible tabs itself via an explicit route-name allow-list. Both tab screens render a distinct guest-appropriate empty state when `benutzer` is `null` rather than falling back to placeholder identity data — match that pattern in any new `(app)` screen. The tab bar has a floating center `CameraButton` that calls `onboardingStore.starten()` before pushing `/scan/rezept`, to start a **new** Versorgung (not a tab) — every new Versorgung re-collects AGB/Datenschutz consent via the onboarding machine (starts at `WILLKOMMEN`), including for repeat orders; this is a deliberate choice, not a bug, so don't "optimize" it into skipping straight to the camera without checking first.
- `app/scan/` — the full "start a Versorgung" flow, **reused for both first-time onboarding and repeat orders** (hence living under `scan/`, not `onboarding/`): `rezept` → `review` → `krankenkasse` → `datenpruefung` → `versorgungen` → `termin` → `zusammenfassung` → `checkout`. Every screen calls `useOnboardingGuard(status)` first. Mock OCR (`simuliereRezeptOcr`, `simuliereKrankenkasseOcr`) and the mock product catalog (`MOCK_PRODUKTE`) live in `lib/mockOcr.ts` — OCR is split across the two capture screens (prescription fields on `rezept.tsx`, insurance fields on `krankenkasse.tsx`) rather than one combined call, so `session.ocrResult` is progressively filled in. `checkout.tsx` skips the phone/OTP substep entirely and jumps straight to payment if `authStore.benutzer` already exists (the repeat-order case, including one just recognized via the Krankenkassenkarte archive match) — see `hooks/useOtpVerification.ts` for the shared send/verify mechanics, now used only by `checkout.tsx`.

### State (`store/`)

Four independent Zustand stores; `onboardingStore` is allowed to call into `authStore`/`versorgungStore` one-directionally (from `abschliessen()`), but not the reverse — `authStore`/`versorgungStore` have no awareness of onboarding:
- `authStore.ts` — `benutzer`/`token`/`onboardingAbgeschlossen`, persisted to AsyncStorage under `sanime_*` keys, hydrated via `laden()` on app boot.
- `onboardingStore.ts` — see "State machine" above.
- `versorgungStore.ts` — order/supply history (`Versorgung[]`), backed by `MOCK_VERSORGUNGEN` with a fake network delay in `laden()`. Also exports `baueVersorgungAusSession(session, versorgungId)`, the pure function that turns a completed `OnboardingSession` into a real `Versorgung` — called only from `onboardingStore.abschliessen()`. Swap the mock data for a real API call rather than adding logic elsewhere.
- `scanStore.ts` **has been deleted** — its fields (photo URIs, OCR result/confidence, selected product) now live on `OnboardingSession`. If you find a reference to it, it's stale.

**Types (`types/index.ts`)**: single source of truth for domain types — `OrderStatus`, OCR result/confidence shapes, `Produkt`, `Versorgung`/`TimelineEvent`/`OffeneAktion`, `Benutzer`, plus the onboarding-session types added alongside them: `OnboardingStatus`, `OnboardingSession`, `Einwilligung`/`OnboardingConsent` (versioned/timestamped consent records — `ipAdresse` field exists but is only ever backend-set, never client-side), `TerminSlot`, `CustomerContact`. Extend here rather than declaring ad-hoc shapes in components; the transition table/reducer logic itself belongs in `store/onboardingMachine.ts`, not here.

**`lib/`**: pure helpers with no React dependency —
- `ocr/` — real, on-device OCR (`erkenneRezept()`/`erkenneKrankenkasse()`, plus `detector.ts`, `processor.ts`, `engine.ts`, `rezeptParser.ts`, `egkParser.ts`, `validatoren.ts`, `mapper.ts`), wired into `app/scan/rezept.tsx`/`krankenkasse.tsx` as a drop-in replacement for the former mock functions. Runs entirely on-device via `expo-text-extractor`; throws `FalschesDokumentError` when the photographed document doesn't match the expected type. `processor.ts`'s `normalisiereBild()` deliberately does *not* do perspective correction/denoise/contrast for v1 (EXIF-rotation-baking + downscale only) — see `work/Ocrintegration.md` before treating that as a bug to fix.
- `mockOcr.ts` — now only supplies `MOCK_PRODUKTE` (the product catalog, still a placeholder). This is the injection point for a real catalog API.
- `terminplanung.ts` — `generiereTerminVorschlaege(session)`: deterministic business-day appointment-slot generator (parses `Produkt.lieferzeit`, skips weekends); slot IDs are derived from `session.id` so a resumed session shows the *same* 3 slots rather than re-rolling them. Also `terminAusKalenderdatum()` for the manual-calendar path.
- `analytics.ts` — `trackOnboarding(event)` takes a **closed discriminated union** (`OnboardingAnalyticsEvent`) with no payload slot capable of carrying OCR values, names, or diagnoses — health data is structurally unrepresentable in an event, not merely filtered at runtime. Events fire centrally from `onboardingStore.dispatch()`'s internal mapping, not from individual screens (guarantees exactly one event per real transition, and keeps the entire "no health data in analytics" surface auditable in one file).

**`constants/legal.ts`**: `AGB_VERSION`/`DATENSCHUTZ_VERSION` string constants (bump on text changes — this is the audit trail until a backend/CMS exists) plus the placeholder legal text shown on `agb.tsx`/`datenschutz-text.tsx`.

**Labels (`constants/labels.ts`)**: German user-facing copy for `OrderStatus` (label + description) plus `StatusSteps`, the canonical ordered subset of statuses used to render timelines. Status display strings belong here, not inline in components.

**Design system (`packages/@sanime/design-system`)**: an internal monorepo package — `colors.ts`, `spacing.ts`, `radius.ts`, `blur.ts`, `glass.ts`, `opacity.ts`, `shadows.ts`, `typography.ts`, `durations.ts`, `springs.ts`, `haptics.ts`, `elevation.ts` — aggregated via its `index.ts` into a `D` object (colors, spacing, radii, typography, spring presets) plus named exports like `durations`. This replaced the former `constants/design.ts`/`constants/colors.ts` split (both files are deleted); `D` is a 1:1-compatible import, so existing call sites didn't need to change shape. Import as `@sanime/design-system`. Every onboarding/scan screen and every `components/onboarding/*`/`components/ui/*` component uses this exclusively now — there is no second/older token system to avoid.

**Naming convention**: this codebase is German-first — identifiers, store fields, and route segments use German terms (`benutzer`, `laden`, `abmelden`, `versorgung`, `zurücksetzen`, `krankenkasse`, `rezept`). Match this convention for new domain code; don't anglicize field names.

**Components (`components/`)**: `components/ui/` holds generic building blocks (Button, Card, GlassCard, CameraButton, StatusBadge, CircularProgress, ProcessStep, SectionHeader, and now `Checkbox` + `FormField`); `components/onboarding/` holds onboarding/scan-specific composites (`DatenFeld` — the editable OCR-field-with-confidence-dot, shared by `review.tsx`/`datenpruefung.tsx`; `StepCounter`; `MiniKalender`; `OnboardingLoadingView`, the guard's loading fallback); `components/dashboard/` holds dashboard-specific composites (StatusTimeline, VersorgungCard). Business logic belongs in stores/screens, not in these UI components.

## Manual/interactive testing

There's no automated UI test runner, and this is a native app — `npm run typecheck`/`lint` catch static errors but not navigation/state bugs (several real bugs, including one that made a screen's confirmation checkbox completely unreachable, were only caught by actually tapping through the app). For interactive verification, drive a real iOS Simulator with **`idb`** (Meta's iOS Development Bridge) rather than guessing from screenshots alone.

**One-time setup:**
```bash
brew tap facebook/fb
brew trust --formula facebook/fb/idb-companion   # required: idb-companion is an untrusted (non-default) tap
brew install idb-companion
brew install pipx
brew install python@3.11   # fb-idb's asyncio usage is incompatible with newer Python (3.12+); pin 3.11
pipx install fb-idb --python /opt/homebrew/opt/python@3.11/bin/python3.11
```
`npx expo start --ios` will try to auto-install Expo Go and typically fails in a sandboxed/no-App-Store environment ("Fetching Expo Go" → `fetch failed`) — and Expo Go generally only supports one or two recent SDKs anyway, so for this repo's SDK version it may simply be unavailable. Use a real dev build instead: `npx expo run:ios` (builds native + installs on the simulator; first run takes several minutes for CocoaPods/Xcode build).

**Per-session:**
```bash
export PATH="$PATH:/Users/lemi/.local/bin"          # idb CLI lives here after pipx install
UDID=$(xcrun simctl list devices | grep Booted | grep -oE '[0-9A-F-]{36}')
idb_companion --udid $UDID &                         # one companion process per booted simulator
idb connect $UDID <port-from-companion-stdout>       # or just `idb list-targets` to confirm "Connected"
```
Then drive it:
```bash
idb ui describe-all --udid $UDID   # dumps the accessibility tree as JSON: every AXLabel + its {x,y,width,height} frame,
                                    # in POINT space (not pixels) — same space `ui tap` expects. This is the reliable
                                    # way to find what to tap; don't eyeball coordinates from a screenshot's pixel size.
idb ui tap <x> <y> --udid $UDID
idb ui text "some text" --udid $UDID   # types into whatever TextInput is currently focused
idb ui swipe <x1> <y1> <x2> <y2> --udid $UDID   # scroll; also in point space
xcrun simctl io $UDID screenshot /tmp/out.png   # screenshot is in PIXEL space — don't mix the two coordinate systems
```
A small helper for tap-by-accessibility-label (finds the element, taps its center) is worth writing once per session — see the pattern of `describe-all` piped through a short Python script filtering by `AXLabel`.

**Gotchas hit in practice:**
- Native system sheets (the photo picker, permission dialogs) are a separate process and don't appear in `describe-all` — estimate their coordinates from a screenshot instead (convert pixel→point by dividing by the device's scale factor, e.g. 1206px / 402pt = 3.0 on an iPhone 17 Pro).
- If the app stops responding to Fast Refresh (edits not showing up after a file save), the dev-client's live Metro connection has likely dropped — `xcrun simctl terminate $UDID <bundle-id> && xcrun simctl launch $UDID <bundle-id>` fetches a fresh bundle without clearing AsyncStorage/app state.
- A floating/overlapping element (e.g. two views occupying the same screen region) doesn't always deliver taps to whichever one is visually on top — if a tap keeps landing on the wrong element despite correct-looking coordinates, that's a real hit-testing ambiguity worth flagging, not just an automation mistake.
- After adding new route files, expo-router's typed-routes declaration (`.expo/types/router.d.ts`) is normally regenerated by the dev server on file-watch; if you're editing routes without a running `expo start`, it can go stale and cause spurious `tsc` errors on `router.push('/new/route')` calls — regenerate by starting the dev server once, or via `expo-router`'s `typed-routes/generate` module directly.
