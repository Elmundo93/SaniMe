import { PRODUKT_IDS } from './catalog.seed-data';

// Kuratierte Q&A-Bibliothek („Ratgeber“) — Platzhalter-Inhalte für die
// Entwicklung, in eigenen Worten formuliert, mit Quellenangabe. Keine Heil- oder
// Wirkversprechen, keine Eignungs- oder Diagnoseaussagen (HWG). geprueftAm bleibt
// null, bis die Redaktion/Rechtsprüfung einen Eintrag freigibt — die App zeigt
// dann „Noch nicht redaktionell geprüft“. Upsert per slug (qa.seed.ts).

export interface SeedQaLink {
  productId?: string;
  categorySlug?: string;
  bedarfId?: string;
  krankheitsbildId?: string;
}

export interface SeedQaEintrag {
  slug: string;
  frage: string;
  kurzantwort: string;
  antwort: string;
  quellen: { titel: string; url: string }[];
  links: SeedQaLink[];
}

const SGB_V_33 = { titel: '§ 33 SGB V – Hilfsmittel', url: 'https://www.gesetze-im-internet.de/sgb_5/__33.html' };
const SGB_V_61 = { titel: '§ 61 SGB V – Zuzahlungen', url: 'https://www.gesetze-im-internet.de/sgb_5/__61.html' };
const SGB_V_62 = { titel: '§ 62 SGB V – Belastungsgrenze', url: 'https://www.gesetze-im-internet.de/sgb_5/__62.html' };
const HMV = { titel: 'GKV-Spitzenverband: Hilfsmittelverzeichnis', url: 'https://hilfsmittel.gkv-spitzenverband.de' };
const SGB_XI_40 = { titel: '§ 40 SGB XI – Pflegehilfsmittel', url: 'https://www.gesetze-im-internet.de/sgb_11/__40.html' };

export const QA_EINTRAEGE: SeedQaEintrag[] = [
  {
    slug: 'zahlt-die-kasse-einen-rollator',
    frage: 'Zahlt die Krankenkasse einen Rollator?',
    kurzantwort: 'Mit ärztlicher Verordnung meist ja — du zahlst dann nur die gesetzliche Zuzahlung.',
    antwort:
      'Ein Rollator ist ein Hilfsmittel im Sinne der gesetzlichen Krankenversicherung. Verordnet deine Ärztin oder dein Arzt einen Rollator, übernimmt die Kasse in der Regel die Kosten für ein Standardmodell.\n\nDu zahlst die gesetzliche Zuzahlung: zehn Prozent des Preises, mindestens 5 und höchstens 10 Euro.\n\nWünschst du ein Modell mit Ausstattung, die über das Notwendige hinausgeht, können Mehrkosten anfallen. Darüber informieren wir dich vorher.',
    quellen: [SGB_V_33, SGB_V_61, HMV],
    links: [{ categorySlug: 'rollatoren' }, { bedarfId: 'gehen' }],
  },
  {
    slug: 'rollator-griffhoehe-einstellen',
    frage: 'Wie stelle ich die Griffhöhe meines Rollators richtig ein?',
    kurzantwort: 'Stell dich aufrecht hin: Die Griffe sollten etwa auf Höhe deiner Handgelenke liegen.',
    antwort:
      'Eine gute Faustregel: Stell dich mit Straßenschuhen aufrecht hin und lass die Arme locker hängen. Die Griffe gehören etwa auf Höhe deiner Handgelenke.\n\nSo geht es:\n- Feststellschrauben an beiden Griffen lösen\n- Beide Griffe auf dieselbe Markierung stellen\n- Schrauben wieder fest anziehen und kurz testen\n\nBeim Gehen sollten deine Ellenbogen leicht gebeugt sein. Wenn du unsicher bist, stellen wir den Rollator bei der Übergabe gemeinsam mit dir ein.',
    quellen: [{ titel: 'Allgemeine Gebrauchshinweise für Rollatoren (Herstellerunabhängig)', url: 'https://hilfsmittel.gkv-spitzenverband.de' }],
    links: [{ categorySlug: 'rollatoren' }],
  },
  {
    slug: 'was-ist-die-gesetzliche-zuzahlung',
    frage: 'Was ist die gesetzliche Zuzahlung?',
    kurzantwort: 'Ein kleiner Eigenanteil an Kassenleistungen: 10 %, mindestens 5 €, höchstens 10 € pro Hilfsmittel.',
    antwort:
      'Für die meisten Hilfsmittel, die die gesetzliche Krankenkasse bezahlt, leistest du eine Zuzahlung. Sie beträgt zehn Prozent des Abgabepreises, mindestens 5 und höchstens 10 Euro — aber nie mehr als das Hilfsmittel kostet.\n\nFür Hilfsmittel, die verbraucht werden (zum Beispiel Inkontinenzartikel), gilt eine andere Regel: zehn Prozent, höchstens 10 Euro für den Monatsbedarf.\n\nKinder und Jugendliche unter 18 Jahren sind befreit. Bei SaniMe wird die Zuzahlung erst nach der Genehmigung durch deine Kasse berechnet.',
    quellen: [SGB_V_61],
    links: [{ categorySlug: 'mobil-bleiben' }, { categorySlug: 'hygiene-inkontinenz' }, { categorySlug: 'bad-toilette' }],
  },
  {
    slug: 'befreiung-von-der-zuzahlung',
    frage: 'Kann ich mich von der Zuzahlung befreien lassen?',
    kurzantwort: 'Ja, wenn deine Zuzahlungen im Jahr eine Belastungsgrenze überschreiten.',
    antwort:
      'Die Zuzahlungen eines Jahres sind begrenzt: auf zwei Prozent deines Bruttoeinkommens, bei schwerwiegend chronisch Kranken auf ein Prozent.\n\nIst die Grenze erreicht, kannst du bei deiner Krankenkasse eine Befreiung für den Rest des Jahres beantragen. Bewahre dafür deine Quittungen auf.',
    quellen: [SGB_V_62],
    links: [{ categorySlug: 'mobil-bleiben' }, { categorySlug: 'pflege-schlafen' }],
  },
  {
    slug: 'brauche-ich-ein-rezept',
    frage: 'Brauche ich für jedes Hilfsmittel ein Rezept?',
    kurzantwort: 'Nein. Ein Rezept brauchst du nur, wenn die Kasse zahlen soll. Viele Alltagshelfer kannst du direkt kaufen.',
    antwort:
      'Soll die Krankenkasse die Kosten übernehmen, brauchst du eine ärztliche Verordnung. Das gilt für Hilfsmittel mit einer Hilfsmittelnummer.\n\nViele kleine Helfer — etwa Greifzangen, Anziehhilfen oder Leselupen — kannst du ohne Rezept als Selbstzahler bestellen. Im Katalog erkennst du sie am Preis statt am Hinweis auf die Kostenübernahme.',
    quellen: [SGB_V_33],
    links: [{ categorySlug: 'zuhause' }, { categorySlug: 'gesundheit' }],
  },
  {
    slug: 'duschhocker-oder-duschstuhl',
    frage: 'Duschhocker oder Duschstuhl — worin liegt der Unterschied?',
    kurzantwort: 'Ein Duschstuhl hat eine Rückenlehne, ein Hocker nicht.',
    antwort:
      'Beide ermöglichen es, im Sitzen zu duschen. Ein Duschhocker ist kleiner und passt auch in enge Duschen. Ein Duschstuhl hat eine Rückenlehne und oft Armlehnen, an denen du dich beim Aufstehen abstützen kannst.\n\nAchte auf die maximale Belastbarkeit und darauf, ob sich die Sitzhöhe einstellen lässt. Im Katalog kannst du nach beidem filtern.',
    quellen: [HMV],
    links: [{ categorySlug: 'duschhilfen' }, { bedarfId: 'duschen' }],
  },
  {
    slug: 'pflegehilfsmittel-pflegekasse',
    frage: 'Was zahlt die Pflegekasse bei einem Pflegegrad?',
    kurzantwort: 'Pflegehilfsmittel, die die Pflege zu Hause erleichtern — etwa Pflegebetten oder Verbrauchsmaterial.',
    antwort:
      'Hast du einen Pflegegrad, kann die Pflegekasse Pflegehilfsmittel übernehmen. Dazu gehören technische Hilfen wie ein Pflegebett und zum Verbrauch bestimmte Produkte wie Einmalhandschuhe.\n\nFür Verbrauchsprodukte gibt es einen monatlichen Höchstbetrag. Technische Pflegehilfsmittel werden oft leihweise zur Verfügung gestellt.',
    quellen: [SGB_XI_40],
    links: [{ categorySlug: 'pflege-schlafen' }, { categorySlug: 'hygiene' }, { bedarfId: 'pflegen' }, { krankheitsbildId: 'pflegebett' }],
  },
  {
    slug: 'inkontinenzartikel-monatsbedarf',
    frage: 'Wie werden Inkontinenzartikel geliefert?',
    kurzantwort: 'In der Regel als Monatsbedarf, diskret verpackt nach Hause.',
    antwort:
      'Inkontinenzartikel werden meist für einen Monat im Voraus geliefert. Mit Verordnung übernimmt die Kasse die Kosten für eine ausreichende Versorgung; du leistest die Zuzahlung für den Monatsbedarf.\n\nDie Lieferung kommt in neutraler Verpackung. Passt die Größe oder Saugstärke nicht, kannst du sie für die nächste Lieferung ändern.',
    quellen: [SGB_V_33, SGB_V_61],
    links: [{ categorySlug: 'inkontinenzartikel' }, { krankheitsbildId: 'inkontinenz' }],
  },
  {
    slug: 'kompressionsstruempfe-anziehen',
    frage: 'Wie ziehe ich Kompressionsstrümpfe leichter an?',
    kurzantwort: 'Am besten morgens, mit Gummihandschuhen oder einer Anziehhilfe.',
    antwort:
      'Kompressionsstrümpfe lassen sich morgens am leichtesten anziehen, bevor die Beine anschwellen.\n\nHilfreich sind:\n- Gummihandschuhe für besseren Griff\n- Eine Anziehhilfe, über die der Strumpf gleitet\n- Den Strumpf bis zur Ferse auf links drehen und dann hochrollen\n\nZieh nicht am oberen Rand, sondern streiche den Strumpf nach oben aus.',
    quellen: [{ titel: 'Allgemeine Anwendungshinweise für Kompressionsstrümpfe', url: 'https://hilfsmittel.gkv-spitzenverband.de' }],
    links: [{ categorySlug: 'kompression' }, { categorySlug: 'anziehhilfen' }, { krankheitsbildId: 'kompression' }],
  },
  {
    slug: 'rollstuhl-faltbar-transport',
    frage: 'Passt ein faltbarer Rollstuhl ins Auto?',
    kurzantwort: 'Meist ja — gefaltet ist er etwa 30 cm schmal. Prüfe die Maße deines Kofferraums.',
    antwort:
      'Faltrollstühle lassen sich zusammenklappen und passen so in viele Kofferräume. Entscheidend sind Faltmaß und Gewicht: Je leichter, desto einfacher das Einladen.\n\nDie Fußrasten lassen sich bei vielen Modellen abnehmen, das spart zusätzlich Platz.',
    quellen: [HMV],
    links: [{ categorySlug: 'rollstuehle' }, { productId: PRODUKT_IDS.rollstuhlAktiv }, { bedarfId: 'unterwegs' }],
  },
  {
    slug: 'rollator-bremsen-pruefen',
    frage: 'Wie oft sollte ich die Bremsen meines Rollators prüfen?',
    kurzantwort: 'Kurz vor jeder Nutzung testen, gründlich etwa einmal im Monat.',
    antwort:
      'Drück vor dem Losgehen kurz beide Bremsgriffe: Der Rollator sollte sich dann nicht mehr schieben lassen.\n\nEinmal im Monat lohnt ein genauerer Blick auf Bremszüge und Reifen. Lassen die Bremsen nach, können sie meist nachgestellt werden — sonst hilft ein Ersatz-Bremsset.',
    quellen: [{ titel: 'Allgemeine Gebrauchshinweise für Rollatoren (Herstellerunabhängig)', url: 'https://hilfsmittel.gkv-spitzenverband.de' }],
    links: [{ productId: PRODUKT_IDS.rollatorLeicht }, { categorySlug: 'mobil-zubehoer' }],
  },
  {
    slug: 'leselupe-welche-vergroesserung',
    frage: 'Welche Vergrößerung brauche ich bei einer Leselupe?',
    kurzantwort: 'Für Zeitung und Buch reicht oft eine 2- bis 3-fache Vergrößerung.',
    antwort:
      'Je stärker die Vergrößerung, desto kleiner ist das sichtbare Feld. Für das Lesen von Zeitungen und Büchern reicht vielen eine 2- bis 3-fache Lupe.\n\nEin eingebautes Licht hilft zusätzlich, besonders abends. Sprich bei deutlich nachlassender Sehkraft mit deiner Augenärztin oder deinem Augenarzt.',
    quellen: [HMV],
    links: [{ categorySlug: 'lese-sehhilfen' }, { bedarfId: 'lesen' }, { krankheitsbildId: 'sehhilfen' }],
  },
];
