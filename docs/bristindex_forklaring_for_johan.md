# Förklaring av Granskningsverktyget och Bristindex-beräkningen

## Vad är verktyget?

Granskningsverktyget är en webbapplikation som används för att systematiskt granska webbsidors digitala tillgänglighet. Verktyget är utvecklat för att underlätta tillsynsprocessen där myndigheter och organisationer kontrolleras mot tillgänglighetskrav enligt EN 301 549 och WCAG 2.2.

### Verktygets huvudfunktioner:
- **Regelfilshantering**: Laddar upp JSON-baserade regelfiler som innehåller strukturerade krav för tillgänglighet
- **Stickprovshantering**: Definierar och hanterar stickprov (specifika webbsidor eller delar av webbplatser) som ska granskas
- **Strukturerad granskning**: Systematisk genomgång av krav med bedömning av kontrollpunkter och godkännandekriterier
- **Dokumentation**: Möjlighet att dokumentera observationer, kommentarer och resultat för varje krav
- **Resultatberäkning**: Automatisk beräkning av ett kvantifierat mått på tillgänglighetsbrister

## Vad är Bristindex?

Bristindex är ett kvantifierat mått (0-100) som anger graden av tillgänglighetsbrister i en granskad webbplats. **Lägre värden är bättre** - 0 betyder inga brister, 100 betyder maximala brister.

## Hur beräknas Bristindex?

### 1. Viktberäkning per krav (ωp)

Varje krav får en vikt baserat på dess påverkan på användargrupper:

```
ωp = isCriticalFactor × √(primaryScore + 0.5 × secondaryScore)
```

**Komponenter:**
- **isCriticalFactor**: 1.0 för kritiska krav, 0.9 för icke-kritiska krav
- **primaryScore**: Antal funktionsgrupper som påverkas direkt (från EN 301 549 tabell B1)
- **secondaryScore**: Antal funktionsgrupper som påverkas indirekt (från EN 301 549 tabell B2)

**Exempel från regelfilen:**
- Ett krav med `primaryScore: 3`, `secondaryScore: 1`, `isCritical: false` får vikten:
  - ωp = 0.9 × √(3 + 0.5 × 1) = 0.9 × √3.5 ≈ 1.69

### 2. Bristpoäng per krav

För varje krav beräknas bristpoäng baserat på antalet misslyckade godkännandekriterier:

```
Bristpoäng = Antal misslyckade kriterier × kravets vikt
```

### 3. Normalisering till Bristindex

Bristindex beräknas som en procentuell andel av möjliga bristpoäng:

```
Bristindex = (Totala bristpoäng / Totala möjliga vikter) × 100
```

### 4. Gruppering efter principer

Bristindex beräknas både totalt och per WCAG-princip (Perceivable, Operable, Understandable, Robust).

## Praktiskt exempel

Antag att vi granskar en webbplats med följande resultat:

**Krav 1** (vikt 1.69):
- 2 av 3 godkännandekriterier misslyckas
- Bristpoäng: 2 × 1.69 = 3.38

**Krav 2** (vikt 2.1):
- 1 av 2 godkännandekriterier misslyckas  
- Bristpoäng: 1 × 2.1 = 2.1

**Totala möjliga vikter**: 1.69 + 2.1 = 3.79
**Totala bristpoäng**: 3.38 + 2.1 = 5.48
**Bristindex**: (5.48 / 3.79) × 100 = 144.6%

*Notera: Bristindex kan överstiga 100% eftersom antalet misslyckade kriterier kan vara större än antalet möjliga vikter per krav.*

## Varför denna metod?

### Vetenskaplig grund
- **EN 301 549-data**: Använder etablerad standard för att kvantifiera påverkan på funktionsgrupper
- **Kvadratisk viktning**: √(primary + 0.5×secondary) ger en balanserad viktning som inte övervärderar direkta påverkan
- **Kritisk faktor**: Särskilt viktiga krav får högre vikt

### Praktiska fördelar
- **Kvantifierat mått**: Ger ett objektivt sätt att jämföra webbplatser
- **Transparent metod**: Alla beräkningar är spårbara och förståeliga
- **Flexibel**: Kan anpassas för olika typer av granskningar och regelfiler

## Möjliga förbättringar och överväganden

### Metodologiska frågor:
1. **Överviktning**: Bristindex kan överstiga 100% - är detta önskvärt eller ska det begränsas?
2. **Viktning av kritiska krav**: Är skillnaden mellan 1.0 och 0.9 för kritiska krav tillräcklig?
3. **Kvadratisk viktning**: Är √-funktionen optimal eller skulle linjär viktning vara bättre?

### Praktiska överväganden:
1. **Benchmarking**: Behövs referensvärden för vad som är "bra" eller "dåligt"?
2. **Tidsserier**: Hur ska förändringar över tid mätas och tolkas?
3. **Sammanvägning**: Hur ska resultat från flera stickprov vägas samman?

## Slutsats

Denna metod ger en strukturerad och transparent väg att kvantifiera tillgänglighetsbrister, vilket kan vara värdefullt för både tillsynsmyndigheter och organisationer som arbetar med tillgänglighetsförbättringar. Bristindexet erbjuder ett objektivt sätt att mäta och jämföra tillgänglighetsnivåer, vilket kan underlätta både tillsynsarbete och förbättringsprocesser.

---

*Dokument skapat: 2024-12-19*  
*För: Johan (nationalekonom)*  
*Syfte: Förklaring av granskningsverktyget och bristindex-beräkningen*
