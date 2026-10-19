-- Katalogplan Phase 4b: der eigene Krankheitsbild-FSM-Pfad entfällt — die
-- Krankheitsbild-Discovery ist jetzt sessionlos und mündet in die
-- KATALOG_PRODUKT_*-Events. Laufende Sessions in den entfernten Zuständen
-- springen zurück auf die Leistungsübersicht (Einwilligung bleibt erhalten);
-- ein Krankheitsbild-Selbstzahler-Pfad wird zum Katalog-Selbstzahler-Pfad
-- (gleiche Schritte ab TERMINPLANUNG, nur der Rücksprung zielt anders).
UPDATE "onboarding_sessions" SET "status" = 'LEISTUNGSUEBERSICHT'
  WHERE "status" IN ('KRANKHEITSBILD_ERFASSUNG', 'KRANKHEITSBILD_EMPFEHLUNG');--> statement-breakpoint
UPDATE "onboarding_sessions" SET "entry_path" = 'KATALOG_SELBSTZAHLER'
  WHERE "entry_path" = 'KRANKHEITSBILD_SELBSTZAHLER';
