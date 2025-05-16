
# Teknisk specifikation: Webbapplikation för digital tillsyn

**Version:** 1.2  
**Datum:** 2025-05-14

## 1. Mål och Syfte

Webbapplikationen ska användas för digital tillsyn av webbsidor och digitala enheter. Användaren laddar upp en regelfil i JSON-format, definierar stickprov, granskar krav, dokumenterar observationer, och exporterar resultat. Applikationen guidar användaren genom hela processen och stödjer sparande och laddning av pågående arbete.

## 2. Teknisk arkitektur

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- Modulär och komponentbaserad kod
- Ingen databaskoppling, körs lokalt
- Stöd för moderna skrivbordswebbläsare (Chrome, Firefox, Edge)

### Filstruktur
- `js/`: JavaScript-logik och hjälpfunktioner (t.ex. `main.js`, `state.js`)
- `js/components/`: UI-komponenter som ES6-moduler
- `css/`: Global stil (`style.css`) och komponentunika CSS-filer

### CSS och Tema
- CSS-variabler för färger och typsnitt
- Global `style.css` för grundläggande styling
- Varje komponent laddar sin egen CSS-fil vid initiering

### Rendering
- Endast minimalt innehåll i `index.html` (t.ex. `<div id="app-container"></div>`)
- All vy- och komponentrendering sker via JavaScript

### Routing
- Använder URL-hash (#) för navigation mellan vyer
- `main.js` lyssnar på hashförändringar och byter vy

## 3. Allmänna Krav och Principer

- **Datauthållighet:** Spara pågående granskningsdata i sessionStorage (klarar sidomladdning och navigering bakåt/framåt)
- **Kodstil:** Snake_case för egna JS-variabler, camelCase för DOM och JSON-nycklar
- **Event delegation:** Används där det är lämpligt
- **Responsiv design:** Anpassad för 1080p, funktionell ner till ca 320px
- **Designestetik:** Modernt, professionellt och färgglatt (t.ex. teal/coral-tema), rundade hörn, sans-serif-typsnitt (Roboto)

## 4. Kärnfunktionalitet och Arbetsprocess

### 4.1 Start och Initialisering
- Knapp för att ladda upp pågående granskning
- Knapp för att starta ny granskning
- Regelfil (JSON) laddas upp och valideras
- Vid lyckad validering sparas innehåll och navigering sker till metadata-vyn

### 4.2 Metadata-inmatning
- Formulär för metadata: ärendenummer, aktör, länk, ansvarig, intern kommentar (alla fält frivilliga)
- "Fortsätt till stickprov"-knapp

### 4.3 Stickprovs-hantering
- Lägg till, redigera och lista stickprov
- Ange typ av sida, beskrivning, URL och innehållstyper
- Kravlistning kopplat till respektive stickprov

### 4.4 Starta Granskning
- Möjlighet att låsa metadata
- Starttid sätts och granskningsstatus ändras

### 4.5 Genomföra Granskning
- Lista krav, grupperat efter kategori
- Granskningskomponent för krav med checkrutor, observation och kommentar

### 4.6 Avsluta och Låsa Granskning
- Låsningsfunktion för avslutad granskning
- Möjlighet att låsa upp vid behov

### 4.7 Spara och Ladda Granskning
- Spara pågående granskning till fil
- Ladda tidigare sparad granskning från fil

### 4.8 Export av Resultat
- Exportera granskningsresultat som CSV och XLSX (Excel)

## 5. Vystruktur och Logik

- **Startvy:** Ladda upp eller starta granskning
- **Metadata-vy:** Ange eller visa metadata
- **Stickprovs-vy:** Lägg till/visa/redigera stickprov
- **Översiktsvy:** Metadata, lista stickprov, åtgärdsknappar
- **Kravlistvy:** Lista och gruppera krav
- **Kravgranskningsvy:** Granska enskilt krav med inmatningsfält

## 6. Datahantering och Lagring

- `current_audit`: Alla data om granskningen
- `samples`: Lista över stickprov och resultat per krav
- `resultObject`: Status, observation, kommentar, och checkresultat per krav
- Automatisk sparning och tidsstämplar i ISO 8601
- `localStorage` för tema-inställningar

## 7. Tillgänglighet

- Uppfyller WCAG 2.2 AA
- Inga disabled-komponenter, använd aria-disabled och visuell inaktivering
- Full tangentbordsnavigering och färgkontrast
- Stöd för dark mode (både OS och manuell toggle)

## 8. Kodstruktur och Moduler

- `index.html`, `css/style.css`
- `js/main.js`, `state.js`, `audit_logic.js`, `export_logic.js`, `validation_logic.js`, `utils/helpers.js`
- `js/i18n/`: Svenska och engelska JSON-filer
- `js/components/`: UI-komponenter och NotificationComponent.js för meddelanden

## 9. Internationalisering (i18n)

- All UI-text via översättningsfunktion (Translation.t("key"))
- Dynamisk uppdatering vid språkbyte
- Språkväljare i UI, förberett för engelska

## 10. JSON Regelfil

- Validering enligt definierat schema
- Innehåller `metadata` (med `pageTypes`, `contentTypes`) och `requirements`

## 11. Potentiella framtida utökningar

- Mer avancerad sortering/filtrering av listor
- Drag-and-drop av stickprov
- Realtidssamarbete (kräver backend)
- Avancerad rapportgenerering
- Integration med externa system
