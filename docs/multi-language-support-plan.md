# Multi-Language Support Plan: "Hymnes et Cantiques" (RW, FR, EN)

## 1. Goal
Establish the **hymnes-cantiques** app as a tri-lingual platform for the "Hymnes et Cantiques" (HeC) collection, supporting the Kinyarwanda, French, and English editions. This will allow users to access their preferred language or compare translations of the same hymn.

---

## 2. Targeted Collections

### 2.1. Kinyarwanda (Existing)
- **Title:** "Hymnes et Cantiques" (Kinyarwanda)
- **Status:** Already implemented (~350 hymns).
- **ID in App:** `hymnes-rw`.

### 2.2. French (New)
- **Title:** "Hymnes et Cantiques" (Edition 1991)
- **Hymn Count:** 353 hymns.
- **Source:** [Cantiquest.org](https://cantiquest.org/hc).
- **ID in App:** `hymnes-fr`.

### 2.3. English (New)
- **Title:** "Hymns for the Little Flock" (1881/1978 Edition)
- **Hymn Count:** 342 hymns (plus supplementary spiritual songs).
- **Source:** [STEM Publishing](https://www.stempublishing.com/hymns/lf/).
- **ID in App:** `hymnes-en`.

---

## 3. Data Architecture

### 3.1. Unified JSON Storage
Each language will have its own JSON data file in `src/` following the same schema:
- `src/songs.json` (Kinyarwanda)
- `src/songs_fr.json` (French)
- `src/songs_en.json` (English)

### 3.2. Cross-Language Mapping (`src/crossLanguageMap.json`)
A mapping file will link hymns that share the same melody/original text across the three editions.
```json
{
  "hymnes-rw:1": {
    "fr": "hymnes-fr:1",
    "en": "hymnes-en:1"
  },
  "hymnes-rw:10": {
    "fr": "hymnes-fr:10",
    "en": "hymnes-en:301"
  }
}
```

---

## 4. UI/UX Features for Tri-lingual Support

### 4.1. Global Collection Switcher
- In the **Search** or **Settings** screen, a clear toggle/selector to switch between the Kinyarwanda, French, and English editions of the hymnbook.

### 4.2. In-Song Language Toggle
- When viewing a hymn (e.g., #1 in Kinyarwanda), a floating action button or header icon will allow the user to jump directly to the French or English version of that same hymn (based on the `crossLanguageMap`).

### 4.3. Parallel View (Staged Approach)
- **Phase 1:** Jump between languages (Navigation).
- **Phase 2:** Split-screen view to show two languages side-by-side (Ideal for learning or bilingual services).

---

## 5. Implementation Steps

### Phase 1: Content Digitization
1.  **Extract French (HeC 1991):** Parse the 353 hymns into `songs_fr.json`.
2.  **Extract English (Little Flock 1881):** Parse the hymns into `songs_en.json`.
3.  **Map Relationships:** Build the initial `crossLanguageMap.json` for the most common hymns.

### Phase 2: Core Integration
1.  **Update `library.ts`**: Register all three collections in the `COLLECTION_CATALOG`.
2.  **Update State Management**: Ensure `appState.tsx` correctly persists the user's active language/collection.

### Phase 3: Enhanced Navigation
1.  **Header Actions**: Add the language-switching icon to the `SongDetailScreen` header.
2.  **Search Refinement**: Allow searching across all enabled languages simultaneously or filtering by a specific one.

---

## 6. Maintenance & Verification
- **Audit Data**: Ensure hymn numbers and verses match the physical books for all three languages.
- **Sync Melodies**: Link the audio melodies (from the Melody Plan) to all three languages consistently.
