Ja. Der aktuelle App-State ist stabil genug dafür.

Geprüft: npm ci, typecheck und OCR-Tests laufen erfolgreich. Es gibt aber noch 15 moderate npm-Audit-Funde (vor dem Hinzufügen von Backend-Dependencies einmal prüfen/fixen, damit sich das Supply-Chain-Risiko nicht in einem zweiten, unabhängigen package.json wiederholt).

## Vision

Backend nicht als Zusatz zur App bauen, sondern als offizielle SaniMe-Prozesszentrale:

Kunde
→ OnboardingSession
→ Dokumente/OCR
→ Versorgung
→ Auftrag
→ Krankenkasse
→ Lieferant
→ Termin
→ Abschluss

Darüber hinaus: das hier ist kein Backend-Projekt, sondern ein System-Blueprint für die nächsten Jahre. Ziel ist, dass jede spätere Fähigkeit — Cloud-Sync, weitere Krankenkassen, neue Hilfsmittelgruppen, B2B, White-Label — eine **Erweiterung bestehender Domänen** ist, keine Architekturänderung. Das heißt konkret: Fachlogik lebt genau einmal (in `@sanime/domain`), nicht einmal im Client und einmal im Backend; neue Anbieter/Provider werden hinter bestehenden Interfaces eingehängt statt neue Sonderpfade zu bauen; neue Status/Ereignisse erweitern eine bestehende Tabelle/Union statt eine neue Verzweigung im Code zu erzeugen.

## Architekturprinzipien

**1. Domain First statt Backend First.** Nicht zuerst das Backend, zuerst die gemeinsame Fachdomäne. Eine einzige Wahrheit für Status/Typen/Guards statt "App kennt Status A, Backend kennt Status B" — siehe Monorepo-Struktur unten.

**2. Ereignisse als First-Class-Citizens.** Kein reines CRUD-Backend. Jede Fachaktion erzeugt ein Domain-Event (`PrescriptionUploaded`, `OCRCompleted`, `CustomerVerified`, `SupplyCreated`, `SupplySubmitted`, `InsuranceApproved`, `SupplierAssigned`, `AppointmentScheduled`, `DeliveryScheduled`, `SupplyCompleted`, `PaymentFailed`, …). Timeline, Audit, Push, Admin-Aufgabe und Analytics sind **Konsumenten** dieser Events, keine eigene, parallel gepflegte Logik. Konkret: `transition()` (siehe Workflow Engine) liefert neben dem neuen Status auch die Liste ausgelöster Events zurück — heute übernimmt `onboardingStore.emitAnalyticsForTransition()` das per Hand mit einem eigenen `switch`; das wird durch echte, aus der Transition-Tabelle abgeleitete Events ersetzt.

**3. Module statt Tabellen denken.** Tabellen sind wichtig, Verantwortlichkeiten wichtiger. Backend gliedert sich in klar abgegrenzte NestJS-Module: `Identity`, `Customer`, `HealthData`, `Onboarding`, `Document`, `Catalog`, `Supply`, `Order`, `Supplier`, `Appointment`, `Notification`, `Admin`, `Audit`/`Compliance`. Jedes Modul besitzt Controller, Service, Repository, Policies, Events, Tests. Das hält die Codebasis wartbar, wenn Module wachsen.

**4. Eine Workflow Engine, mehrere Maschinen.** `store/onboardingMachine.ts` ist bereits eine kleine Workflow Engine (Transitions-Tabelle + Guards + reiner Reducer, keine React/Zustand-Kopplung). Diesen Kern generisch machen (`createWorkflow<Status, Event, Context>(transitions)`) und zweimal instanziieren: `OnboardingWorkflow` (bestehend) und `SupplyWorkflow` (neu, für das Statusmodell `draft…archived` aus dem Order-Modul). Die Engine entscheidet bei jedem `transition()`: erlaubt? Guards erfüllt? welche Events werden emittiert? — Audit-Eintrag, Timeline-Eintrag, Push und Folgeaufgaben hängen sich als Event-Konsumenten dran, nicht als Zusatzcode in der Engine selbst. Geschäftslogik existiert dadurch nur einmal, und zwar am selben Ort, an dem sie heute schon (isoliert, testbar) liegt.

**5. Value Objects für sensible Identifier.** Gerade im Gesundheitsbereich keine nackten Strings: `InsuranceNumber`, `PhoneNumber`, `Hilfsmittelnummer`, `DocumentHash`, `SupplyId`, `AppointmentId`, `OrderId` validieren sich bei Konstruktion selbst. In diesem Codebase passt dafür ein leichtgewichtiger Branded-Type-Ansatz (Validierungsfunktion + Nominal-Type) besser als volle DDD-Klassen mit `equals`/`hashCode` — der bestehende Stil ist durchgehend plain interfaces/functions, keine Klassenhierarchien. Leben in `@sanime/domain/value-objects`.

**6. Dokumente als eigenes Subsystem.** Pipeline `Storage → Document → DocumentVersion → Verification → Retention`, komplett entkoppelt vom Onboarding-Flow. Dadurch lassen sich später OCR-Reprocessing, Signatur oder Export ergänzen, ohne das Onboarding-Modul anzufassen.

**7. Infrastruktur hinter Interfaces.** Nicht `S3`, sondern `StorageProvider`. Nicht `OTP`, sondern `VerificationProvider` (der bestehende Client-Hook `useOtpVerification.ts` bekommt serverseitig ein austauschbares Gegenstück). Nicht `SMTP`, sondern `NotificationProvider`. Jeweils eine konkrete Implementierung jetzt, austauschbar später — das ist die Voraussetzung dafür, dass Cloud-Sync/White-Label/weitere Krankenkassen wirklich nur Erweiterungen sind.

**8. API-Versionierung ab Tag 1.** `/api/v1/…` von der ersten Route an, auch wenn nur eine Version existiert.

**9. Idempotenz für kritische Aktionen.** Upload, Checkout, `completeOnboarding`, Statuswechsel, OTP-Verifizierung, Dokumentenprüfung: alle über einen Idempotency-Key. Eine doppelt ankommende Anfrage (Netzwerk-Retry auf Mobilfunk, App-Relaunch mitten im Request) darf nichts doppelt erzeugen.

**10. Hintergrundprozesse hinter einer Job-Queue-Schnittstelle.** OCR, Push, Mail, Reminder, Audit-Cleanup, Retention, Exports laufen fachlich asynchron. Pragmatisch für den Piloten: ein `JobQueue`-Interface mit einer trivialen In-Process-Implementierung (kein Redis/BullMQ am Anfang) — dieselbe Schnittstelle, aber ohne die Infrastrukturkosten, bevor sie gebraucht werden. Austausch gegen echte Queue später ändert nur die Implementierung, keinen Aufrufer.

**11. Health-Domain getrennt.** `Customer` (Identität/Kontakt) ist ein anderes Modul als `HealthData` (Versicherung, Rezept-/OCR-Daten). Nicht alles in einer Tabelle. Jeder Read auf der Health-Domain läuft durch eine Repository-Schicht, die automatisch in `access_logs` schreibt — das ist der Hebel, der Prinzip 15 (Compliance) durchsetzbar statt nur dokumentiert macht.

**12. Admin arbeitet auf Aufgaben, nicht auf Orders.** `open_actions` (OCR prüfen → Genehmigung fehlt → Termin bestätigen → Lieferung planen) sind die primäre Admin-Oberfläche; Orders/Timeline entstehen daraus, nicht umgekehrt. Passt zum bereits geplanten Inbox-Konzept, macht es nur zum strukturellen Zentrum statt zu einer Sicht auf Orders.

**13. Observability in vier getrennten Bereichen — pragmatisch gestuft.** Logs, Metrics, Tracing, Audit sind konzeptionell getrennt, aber nicht alle brauchen ab Tag 1 echte Infrastruktur: Logs (strukturiert, Gesundheitsfelder gescrubbt) + Sentry (mit `beforeSend`-Scrubbing ab der ersten Route, nicht erst in der Compliance-Phase) + `/health` sind Layer 1. Metrics/Tracing bekommen von Anfang an die Instrumentierungs-Seams (z. B. OpenTelemetry-API-Aufrufe im Code), aber einen echten Exporter/Dashboard erst, wenn Lastverhalten tatsächlich relevant wird (Layer 5) — ein Prometheus/Grafana/Tempo-Stack für einen Piloten mit einer Handvoll Nutzern ist verfrühte Infrastruktur, keine Architekturfrage.

**14. Teststrategie über sechs Ebenen.** Unit → Integration → API → Workflow → OCR → E2E. Workflow-Tests (auf der generischen Engine aus Prinzip 4) zahlen sich besonders aus, weil sie exakt die Guards testen, die sonst nur implizit über UI-Klicks geprüft würden — Fortsetzung des bestehenden Musters `lib/ocr/*.test.ts`, nur jetzt auch für Zustandsübergänge.

**15. Compliance als eigenes, dauerhaftes Modul.** Nicht verstreut über Sprints, sondern ein Modul, das `consents`, `audit_entries`, `access_logs`, `retention_policy`, `deletion_requests`, `data_export` besitzt. Das Grundgerüst (Schema + Middleware) entsteht in Layer 1 zusammen mit Auth, weil `HealthData` (Prinzip 11) sonst mehrere Layer lang ohne Zugriffs-Nachvollziehbarkeit befüllt würde; vollständig ausdifferenziert (Rollen, Exporte, Löschung) wird es in Layer 4.

## Monorepo-Struktur

```
packages/
  @sanime/domain          # Entities, Value Objects, State Machines (Workflow Engine), Events, Guards — kein React/Zustand/HTTP
  @sanime/contracts        # DTOs, OpenAPI-Definitionen, geteilte API-Typen zwischen Backend und Clients
apps/
  backend                  # NestJS
  admin                    # später, sobald ein eigenständiges Admin-Frontend gebraucht wird
```

Die Mobile-App bleibt bewusst **am Repo-Root**, wird also nicht in `apps/mobile` verschoben — siehe "Bewusste Abweichungen" unten. `store/onboardingMachine.ts` und die zentralen Typen aus `types/index.ts` wandern nach `@sanime/domain`; die App importiert von dort weiter, ihre bestehenden Importpfade (relativ, kein `@/*`-Alias) bleiben ansonsten unverändert. `package.json`-Workspaces erweitern sich um `apps/*`.

## Fachdomäne, Contracts, Implementierungen

```
                 Fachdomäne (unveränderliche Wahrheit)
──────────────────────────────────────────────────────
Entities · Value Objects · State Machines · Events · Policies
──────────────────────────────────────────────────────
                       Contracts
──────────────────────────────────────────────────────
OpenAPI · DTOs · Shared Types
──────────────────────────────────────────────────────
                    Implementierungen
──────────────────────────────────────────────────────
Mobile App · Backend · Admin · OCR · Storage · Notifications · Monitoring
```

Jede Implementierung darf von Fachdomäne und Contracts abhängen, nie umgekehrt. Neue Implementierungen (ein Web-Dashboard, eine zweite mobile Plattform, ein Partner-API-Client) hängen sich unten an, ohne die oberen beiden Schichten zu berühren — das ist der eigentliche Hebel für "Erweiterung statt Architekturänderung".

## Bereits getroffene Entscheidungen

- **Framework:** NestJS (Modul-/Guard-/Interceptor-System passt zu Prinzip 3 und 4 besser als ein minimaler Router).
- **Kunden-Auth vor Login:** `POST /onboarding-sessions` vergibt ein opakes Server-Secret (kein JWT, keine Customer-Identität); Client schickt es als Bearer-Header bei jedem `PATCH`. Bei OTP-Erfolg (`checkout.tsx`) oder Krankenkassenkarten-Archiv-Match (`krankenkasse.tsx`) wird die Session an einen `customers`-Datensatz geclaimt, ab dann gibt es ein echtes kundenscoped Token. Beide Wege münden im selben Claim-Vorgang.
- **Admin-Auth:** RBAC von Anfang an — `role_permissions` ist bereits in Layer 1 aktiv, nicht erst in Layer 4 nachgezogen. E-Mail/Passwort-Login für Admins (kein OTP/Passwortlos wie bei Kunden — andere Nutzergruppe, anderes Bedrohungsmodell).
- **Organizations/Multi-Tenancy/B2B/White-Label:** `organizations`-Tabelle existiert mit `organization_id` auf jeder Fachtabelle, für den Piloten mit genau einem Default-Eintrag. Jede Repository-Methode nimmt von Anfang an einen Tenant-Kontext entgegen (heute immer derselbe Default-Wert) statt implizit global zu lesen — Row-Level-Filterung ist später eine `WHERE`-Klausel in der Repository-Basis, kein Audit aller Aufrufer. `organizations` ist damit auch der spätere Anknüpfungspunkt für B2B (eine Organisation verwaltet Versorgungen mehrerer Kunden) und White-Label (eigenes Branding/eigene Konditionen je Organisation) — keine neue Tabelle, nur neue Felder auf einer bestehenden.

## Roadmap: Layer statt Sprints

### Layer 1 — Foundation
- Monorepo-Umzug: `@sanime/domain` (inkl. generischer Workflow Engine, extrahiert aus `onboardingMachine.ts`), `@sanime/contracts`, `apps/backend`
- Env-Struktur, Postgres, Drizzle-Grundschema, Migrationen
- `GET /api/v1/health`, `GET /api/v1/version`
- Error Handling, strukturiertes Request-Logging ohne Gesundheitsdaten, Sentry inkl. `beforeSend`-Scrubbing ab der ersten Route
- Zwei Auth-Strategien (Kunden-Session-Secret + Claim-Flow, Admin-JWT + RBAC) inkl. Guards
- Audit-/Access-Log-Grundgerüst (`audit_entries`, `access_logs`) + Middleware — läuft von Anfang an mit, nicht nachträglich
- Idempotency-Middleware (Header-basiert)
- `organizations`-Tabelle mit einem Default-Eintrag
- Repository-Basisklasse mit durchgereichtem Tenant-Kontext (heute konstanter Default-Wert) — macht Multi-Tenancy später zu einer Zeile, nicht zu einem Audit

### Layer 2 — Business (Domänen-Module)
**Customer-Modul:** `customers`, `customer_profiles`, `customer_addresses`. Zusätzlicher Endpoint `POST /customers/match` für den Krankenkassenkarten-Archiv-Abgleich (aktuell `lib/mockKundenArchiv.ts`) — der einzige Re-Login-Pfad der App, fehlte im ursprünglichen Endpoint-Schnitt.

**HealthData-Modul:** `insurance_policies`, `ocr_results` (bzw. Prescription-Daten) — getrennt von `Customer`, jeder Read läuft durch die access-log-pflichtige Repository-Schicht (Prinzip 11).

**Onboarding-Modul:** `onboarding_sessions`. Endpoints: `POST /onboarding-sessions`, `GET /onboarding-sessions/current`, `PATCH /onboarding-sessions/:id`, `POST /onboarding-sessions/:id/complete`. Guards (`hatPflichtfelderRezept`, `hatPflichtfelderKomplett`, `telefonVerifiziert`) laufen aus `@sanime/domain` — identisch zum Client, nicht separat gepflegt; ein direkter `PATCH` ohne App kann sie dadurch nicht umgehen. `POST …/complete` vergibt die `versorgungId` serverseitig und gibt sie synchron zurück (ersetzt das aktuell clientseitig erzeugte `v-${Date.now()}` in `onboardingStore.abschliessen()`). Speichert Status, Einwilligungen, ausgewähltes Produkt, Termin, Kontakt, OCR-Metadaten — keine unnötigen Bilddaten direkt in JSON.

**Document-Modul:** `documents`, `document_versions`. Pipeline Storage→Document→DocumentVersion→Verification→Retention. Endpoints: `POST /documents/upload-url`, `POST /documents`, `GET /documents/:id`, `PATCH /documents/:id/status`. Dokumenttypen: prescription, insurance_card, approval, cost_estimate, delivery_note, invoice, handover_confirmation. Pflicht: Hash, MIME-Type, Größe, Versionierung, Status, Zugriff nur über Berechtigung, keine öffentlichen URLs. `StorageProvider`-Interface, eine konkrete S3-kompatible Implementierung.

**Catalog-Modul:** `catalog_categories`, `products`, `manufacturers`, `suppliers`, `supplier_products`. Endpoints: `GET /catalog/categories`, `GET /products`, `GET /products/:id`, `GET /suppliers`. Produktmodell: product, manufacturer, hilfsmittelnummer, category, features, variants, supplier_price, delivery_time, availability, requires_approval. Für den Piloten Platzhalterdaten, aber im echten Schema (siehe CLAUDE.md: `Produkt` bleibt Platzhalter, keine echten Hersteller-/Preisdaten vortäuschen).

**Supply/Order-Modul:** `supplies`, `orders`, `order_status_events`, `timeline_events`, `open_actions`. Zweite Workflow-Engine-Instanz (`SupplyWorkflow`) mit dem finalen Statusmodell: draft, documents_uploaded, ocr_verified, customer_confirmation_required, submitted, insurance_review, approved, rejected, supplier_assigned, ordered, appointment_scheduled, delivered, completed, archived. Beim Abschluss des Onboardings entstehen serverseitig Supply, Order, Timeline, OpenAction, AuditEntry — als Events (`SupplyCreated`, `SupplySubmitted`, `InsuranceApproved`, …), nicht als Sonderlogik im Onboarding-Endpoint. Endpoints: `GET /supplies`, `GET /supplies/:id`, `GET /orders/:id`, `PATCH /orders/:id/status`, `POST /orders/:id/actions`.

### Layer 3 — Operations
**Admin-Modul:** Inbox als primäre Oberfläche (Prinzip 12), Orders sind Nebeneffekt. Endpoints: `GET /admin/inbox`, `GET /admin/orders`, `GET /admin/orders/:id`, `PATCH /admin/orders/:id/status`, `POST /admin/orders/:id/notes`, `POST /admin/orders/:id/timeline`. Aufgabenfluss: OCR prüfen → Dokument prüfen → Krankenkasse kontaktieren → Genehmigung erfassen → Lieferant wählen → Termin koordinieren → Abschließen.

**Supplier-/Appointment-Modul:** `suppliers`, `supplier_products`, `appointments`. Terminvorschläge sind mehr als ein Repository-Swap von `lib/terminplanung.ts` (das generiert Slots aktuell rein deterministisch aus `session.id`, ohne echte Verfügbarkeit) — hier entsteht echte Geschäftslogik für Lieferanten-Kalender/Kapazität.

**Notification-Modul:** `notifications`. `NotificationProvider`-Interface (Push/Mail austauschbar), `VerificationProvider`-Interface (OTP-Versand austauschbar, Gegenstück zu `useOtpVerification.ts`).

**Job-Queue:** In-Process-Implementierung für OCR, Push, Mail, Reminder, Cleanup — gleiche Schnittstelle wie eine spätere echte Queue.

### Layer 4 — Compliance
Compliance-Modul (aus Layer 1 vorbereitet) wird hier abgeschlossen: `consents` versioniert, `audit_entries` vollständig, `access_logs` vollständig genutzt, `data_export`, `deletion_requests`, `retention_policy`. `role_permissions` (aktiv seit Layer 1) wird hier vollständig ausdifferenziert. Durchgehender Grundsatz, hier verifiziert statt neu eingeführt: keine sensiblen Daten in Analytics, Logs, Push-Notifications, Sentry-Breadcrumbs, URLs.

### Layer 5 — Production
**App-Anbindung:** Mocks durch Repository-Schicht ersetzen — `OnboardingRepository`, `SupplyRepository`, `CatalogRepository`, `DocumentRepository`, `AuthRepository`. Betroffene Stellen: `store/versorgungStore.ts`, `store/onboardingStore.ts`, `lib/mockOcr.ts`, `lib/mockKundenArchiv.ts`, `lib/terminplanung.ts`.

**Observability ausbauen:** Metrics-/Tracing-Exporter scharf schalten (Instrumentierung existiert seit Layer 1).

Monitoring, Performance-/Lasttests, Store-Release-Vorbereitung, Pilotbetrieb.

## Fundament heute, Kapazität morgen

"Kommt später" darf nicht heißen "wird nie sauber nachgeholt" — genau das ist die Gefahr, wenn eine eigentlich kurzfristige Vereinfachung ohne klaren Rückweg stehen bleibt. Deshalb hier für jede Stelle, die jetzt bewusst nicht in voller Ausbaustufe gebaut wird: was als Nahtstelle bereits existiert (nahezu kostenlos), was zurückgestellt wird (echte Infrastruktur/Aufwand), und woran objektiv festgemacht wird, dass der Zeitpunkt zum Aufwerten gekommen ist — nicht "wenn mal Zeit ist". Jede Zeile ist so geschnitten, dass der Umstieg eine Erweiterung ist, keine Rearchitektur.

| Bereich | Jetzt (Nahtstelle) | Später (Kapazität) | Trigger | Umstellungsaufwand |
|---|---|---|---|---|
| Multi-Tenancy / B2B / White-Label | `organization_id` auf jeder Tabelle; Repository-Basisklasse reicht überall einen Tenant-Kontext durch (heute konstanter Default-Wert) | Row-Level-Filterung, mandantenspezifische Konfiguration/Branding/Konditionen | Ein realer zweiter Mandant (weiterer B2B-Kunde, White-Label-Partner) steht konkret an | `WHERE organization_id = ?` in der Repository-Basis; kein Aufrufer ändert sich, weil der Kontext schon überall durchgereicht wird |
| Async/Hintergrundprozesse | `JobQueue`-Interface, In-Process-Implementierung | Redis/BullMQ o. ä. | Job-Volumen oder Latenz der In-Process-Variante wird spürbar (OCR/Push/Mail blockieren Requests) | Neue Implementierung hinter demselben Interface; Aufrufer bleiben unverändert |
| Observability | Strukturierte Logs, Sentry mit Scrubbing, `/health`, Instrumentierungs-Seams für Metrics/Tracing | Echter Metrics-/Tracing-Exporter, Dashboards | Mehr als eine Backend-Instanz läuft gleichzeitig, oder ein Fehler lässt sich ohne Tracing nicht mehr eingrenzen | Exporter an bestehende Seams anschließen; keine Änderung an den Call-Sites |
| Value Objects | Branded Types + Validierungsfunktionen | Volle Klassen mit Vergleichs-/Zustandslogik | Ein Value Object bekommt echtes Verhalten, nicht nur Validierung (z. B. Geldbeträge mit Rechenoperationen) | Aufrufstellen nutzen bereits Funktionen statt `new X()` — Umstieg betrifft nur die Definition |
| Ort der Mobile-App | Bleibt am Repo-Root; keine Fachlogik in `packages/@sanime/*` setzt eine bestimmte Ordnerstruktur der App voraus | Physischer Umzug nach `apps/mobile` | `apps/admin` entsteht real und eine einheitliche `apps/*`-Struktur zahlt sich aus | `git mv` + Pfade in `tsconfig`/`metro.config`/CI anpassen — wächst nicht mit der Zeit, weil nichts anderes vom aktuellen Pfad abhängt |

Der Unterschied zu einer klassischen "bauen wir später"-Liste: jede Zeile hat schon jetzt die Nahtstelle, an der später angesetzt wird, und einen Trigger statt eines vagen Zeitpunkts. Nichts davon verengt spätere Optionen — genau das ist die Bedingung, unter der Zurückstellen hier vertretbar ist.

## Nächste Schritte

1. Refactor in der bestehenden App: `store/onboardingMachine.ts` (inkl. Extraktion der generischen Workflow Engine) und die zentralen Typen aus `types/index.ts` nach `packages/@sanime/domain` verschieben; `package.json`-Workspaces um `apps/*` erweitern. Risikoarm, da rein strukturell — keine Verhaltensänderung der App.
2. `apps/backend`-Scaffolding gemäß Layer 1.
