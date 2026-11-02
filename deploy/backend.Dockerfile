# Backend + gebaute Admin-App in einem Image. Gebaut auf dem Server aus einem
# `git archive` des Release-Commits (deploy/deploy.sh) — Kontext = Repo-Wurzel.
#
# Das Backend läuft absichtlich über ts-node (ungebautes @sanime/domain, siehe
# apps/backend/src/main.ts), hier im transpile-only-Modus: die Typprüfung
# passiert vor dem Deploy (npm run backend:typecheck), im Container würde sie
# nur Startzeit und Speicher kosten.

# Nur Lockfile + package.json aller vorhandenen Workspaces (npm ci prüft sie
# gegen das Lockfile; welche es gibt, hängt vom Commit ab). Die deps-Schicht
# bleibt gecacht, solange sich diese Dateien nicht ändern.
FROM node:24-bookworm-slim AS manifeste
WORKDIR /src
COPY . .
RUN mkdir /out && cp package.json package-lock.json /out/ \
 && for m in apps/*/package.json packages/@sanime/*/package.json; do \
      mkdir -p "/out/$(dirname "$m")" && cp "$m" "/out/$m"; done

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY --from=manifeste /out ./
# Nur Backend und Admin, nicht die Expo-App an der Wurzel. --legacy-peer-deps:
# design-system nennt react-native als Peer — das braucht hier niemand.
RUN npm ci --workspace @sanime/backend --workspace @sanime/admin \
      --include-workspace-root=false --legacy-peer-deps --no-audit --no-fund

FROM deps AS admin
COPY packages/@sanime packages/@sanime
COPY apps/admin apps/admin
# Nur vite build: tsc gehört vor den Deploy (npm run admin:typecheck) und
# bräuchte hier die Test-Peer-Abhängigkeiten (@testing-library/dom).
# Die tsconfig.json der Pakete erben von expo/tsconfig.base — Expo ist hier
# nicht installiert, und esbuild braucht die Dateien nicht.
RUN rm packages/@sanime/*/tsconfig.json && cd apps/admin && npx vite build

FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    TS_NODE_TRANSPILE_ONLY=true \
    NPM_CONFIG_UPDATE_NOTIFIER=false \
    ADMIN_APP_DIR=/app/apps/admin/dist \
    PORT=3000
WORKDIR /app
# Ganzes /app aus deps: npm legt je nach Hoisting auch node_modules unter
# apps/backend/ an — ein gezieltes COPY davon schlüge fehl, wenn es fehlt.
COPY --from=deps /app ./
COPY packages/@sanime packages/@sanime
COPY apps/backend apps/backend
COPY --from=admin /app/apps/admin/dist apps/admin/dist
ARG RELEASE=unbekannt
ENV SANIME_RELEASE=$RELEASE
USER node
WORKDIR /app/apps/backend
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/catalog/angebot').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "-r", "ts-node/register", "-r", "tsconfig-paths/register", "src/main.ts"]
