# Granskningsverktyget - Digital Tillsyn

Ett webbaserat verktyg för digital tillsyn av webbsidor och digitala tjänster. Verktyget möjliggör strukturerad granskning enligt definierade regler och export av resultat i olika format.

## 🎯 Översikt

Granskningsverktyget är en modern webbapplikation som stöder hela processen från regelfilsuppladdning till slutlig rapportgenerering. Verktyget är designat för att vara användarvänligt, tillgängligt och effektivt för granskare som arbetar med digital tillsyn.

### Huvudfunktioner

- **Regelfilshantering**: Ladda upp och validera JSON-baserade regelfiler
- **Stickprovshantering**: Definiera och hantera stickprov för granskning
- **Strukturerad granskning**: Systematisk bedömning av krav enligt regelfilen
- **Dokumentation**: Observera och kommentera brister och förbättringsområden
- **Export**: Generera rapporter i CSV, Excel och Word-format
- **Språkstöd**: Svenska och engelska
- **Responsiv design**: Fungerar på desktop och mobil

## 🚀 Snabbstart

### Förutsättningar

- Node.js 18.0.0 eller senare
- Modern webbläsare (Chrome, Firefox, Edge)
- Lokal HTTP-server (för utveckling)

### Installation

1. **Klona repository**
   ```bash
   git clone <repository-url>
   cd granskningsverktyget
   ```

2. **Installera beroenden**
   ```bash
   npm install
   ```

3. **Starta utvecklingsserver**
   ```bash
   npm run dev
   ```

4. **Öppna i webbläsare**
   ```
   http://localhost:5173
   ```

### Produktionsbuild

```bash
npm run build
npm run preview
```

## 📁 Projektstruktur

```
├── css/                          # Stilar
│   ├── components/               # Komponentspecifika CSS
│   ├── features/                # Funktionsspecifika CSS
│   └── style.css                # Globala stilar
├── docs/                        # Dokumentation
├── js/                          # JavaScript-kod
│   ├── components/              # UI-komponenter
│   ├── features/                # Funktionsspecifika moduler
│   ├── i18n/                    # Språkfiler
│   ├── logic/                   # Affärslogik
│   └── utils/                   # Hjälpfunktioner
├── tests/                       # Tester
├── dist/                        # Byggda filer
└── index.html                   # Huvudfil
```

## 🛠️ Utveckling

### Tillgängliga kommandon

```bash
# Utveckling
npm run dev              # Starta utvecklingsserver
npm run dev:fixedport    # Starta med fast port (5173)

# Byggning
npm run build            # Bygg för produktion
npm run preview          # Förhandsgranska byggd app

# Testning
npm run test:e2e         # Kör E2E-tester
npm run test:e2e:ui      # Kör E2E-tester med UI
npm run watch:e2e        # Övervaka ändringar och kör tester

# Kvalitetskontroll
npm run lint             # ESLint
npm run format:check     # Prettier
npm run validate:imports # Validera imports
npm run validate:components # Validera komponenter
npm run validate:css     # Validera CSS
```

### Utvecklingsmiljö

Projektet använder:
- **Vite** för byggsystem och utvecklingsserver
- **ESLint** för kodkvalitet
- **Prettier** för kodformatering
- **Playwright** för E2E-testning
- **Jest** för enhetstester

### Kodstruktur

- **Modulär arkitektur**: Varje komponent är en ES6-modul
- **State management**: Redux-liknande pattern med centraliserad state
- **Komponentbaserat**: Återanvändbara UI-komponenter
- **Internationalisering**: Språkstöd via JSON-filer
- **Responsiv design**: CSS-variabler för tema och styling

## 📖 Dokumentation

All dokumentation finns i `/docs`-mappen:

- **[Användarmanual](docs/anvandarmanual.md)** - Detaljerad guide för slutanvändare
- **[Teknisk specifikation](docs/teknisk_specifikation_v2.0.md)** - Systemkrav och funktionalitet
- **[Systemdokumentation](docs/systemdokumentation.md)** - Intern arkitektur och implementation
- **[Installationsguide](docs/installationsguide.md)** - Detaljerad installationsguide
- **[Utvecklarguide](docs/utvecklarguide.md)** - Guide för utvecklare
- **[API-dokumentation](docs/api-dokumentation.md)** - API-referens

## 🧪 Testning

### E2E-tester

```bash
# Kör alla E2E-tester
npm run test:e2e

# Kör med UI för debugging
npm run test:e2e:ui

# Övervaka ändringar
npm run watch:e2e
```

### Enhetstester

```bash
npm test
```

### Teststruktur

- **E2E-tester**: `/tests/*.spec.js` - Playwright-baserade
- **Enhetstester**: `/tests/unit/` - Jest-baserade
- **Testdata**: Inkluderade i testfilerna

## 🌐 Internationalisering

Verktyget stöder flera språk:

- **Svenska** (standard)
- **Engelska**

Språkfiler finns i `/js/i18n/` och användaren kan växla språk via UI.

## 🎨 Tema och Styling

- **Ljust tema** (standard)
- **Mörkt tema** (tillgängligt via UI)
- **Responsiv design** (1080p → 320px)
- **Tillgänglighet** (WCAG 2.2 AA)

## 📊 Exportformat

Verktyget stöder export i flera format:

- **CSV**: Strukturerad data för vidare analys
- **Excel**: Användarvänlig tabell med formatering
- **Word**: Formaterad rapport för slutrapport

## 🔧 Konfiguration

### Miljövariabler

```bash
# Utveckling
NODE_ENV=development

# Produktion
NODE_ENV=production
```

### Byggkonfiguration

Se `vite.config.mjs` för byggkonfiguration och `playwright.config.js` för testkonfiguration.

## 🐛 Felsökning

### Vanliga problem

1. **Moduler laddas inte**: Kontrollera att du använder en HTTP-server
2. **Tester misslyckas**: Kontrollera att utvecklingsservern körs
3. **Byggning misslyckas**: Kör `npm run lint` för att kontrollera kodkvalitet

### Debugging

```bash
# Aktivera debug-läge för Playwright
PWDEBUG=1 npm run test:e2e:debug

# Kontrollera kodkvalitet
npm run lint
npm run format:check
```

## 🤝 Bidrag

1. Forka repository
2. Skapa feature branch (`git checkout -b feature/ny-funktion`)
3. Commita ändringar (`git commit -am 'Lägg till ny funktion'`)
4. Pusha till branch (`git push origin feature/ny-funktion`)
5. Skapa Pull Request

### Kodstandarder

- Använd ESLint-konfigurationen
- Följ Prettier-formatering
- Skriv tester för ny funktionalitet
- Uppdatera dokumentation vid behov

## 📄 Licens

[Lägg till licensinformation här]

## 📞 Support

För support och frågor:
- Skapa en issue i repository
- Kontakta utvecklingsteamet
- Se dokumentation i `/docs`

## 🔄 Changelog

### Version 2.1.0
- Förbättrad state management
- Ny scoring-modell
- Förbättrad exportfunktionalitet
- Uppdaterad dokumentation

### Version 2.0.0
- Modulär arkitektur
- Redux-liknande state management
- Förbättrad tillgänglighet
- Stöd för flera exportformat

---

**Senast uppdaterad**: 2025-01-27