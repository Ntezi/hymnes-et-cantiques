# Multi-Language Support Plan (French & English)

## 1. Goal
Expand the **hymnes-cantiques** app to support the French and English versions of the "Hymnes et Cantiques" (HeC) collection, allowing users to switch between languages or see cross-referenced lyrics.

---

## 2. Collections & Sources

### 2.1. French (Hymnes et Cantiques - HeC)
- **Standard Edition:** 1991 (containing 353 hymns).
- **Source:** [Cantiquest.org](https://cantiquest.org/hc) or [eblc.ch](https://hc.eblc.ch/melodies.html).
- **ID in App:** `hymnes-fr`.

### 2.2. English (Hymns for the Little Flock / Hymns and Spiritual Songs)
- **Standard Edition:** 1881 or 1978 "Little Flock" hymnbook.
- **Source:** [STEM Publishing](https://www.stempublishing.com/hymns/lf/).
- **ID in App:** `hymnes-en`.

---

## 3. Data Architecture Changes

### 3.1. New Data Files
Create two new JSON files in `src/` to mirror the structure of `songs.json`:
- `src/songs_fr.json`
- `src/songs_en.json`

### 3.2. JSON Format (Uniform for all languages)
```json
[
  {
    "song_number": 1,
    "title": "Title in Uppercase",
    "sub_title": "Tempo/Style (Optional)",
    "verses": [
      "1. Verse content line 1\nVerse content line 2...",
      "2. Verse content..."
    ]
  }
]
```

### 3.3. `src/library.ts` Updates
- Import the new JSON files.
- Add `hymnes-fr` and `hymnes-en` to the `COLLECTION_CATALOG`.
- Map `LanguageCode` to 'fr' and 'en'.

---

## 4. UI/UX Changes

### 4.1. Language Selection
- **Splash Screen / Settings:** Allow users to choose their "Primary Language".
- **Collection Browser:** Show all available collections (RW, FR, EN) in the `SearchScreen` or a new `LibraryScreen`.

### 4.2. Parallel View (Optional/Future)
- When viewing a hymn in Kinyarwanda, add a "View in French" or "View in English" button if a mapping exists (e.g., RW 1 corresponds to FR 1).

### 4.3. Navigation Logic
- Ensure that switching collections updates the `songs` list in `SongListScreen`.
- Persist the selected collection/language in `AsyncStorage`.

---

## 5. Implementation Steps

### Phase 1: Data Acquisition
1.  **Scrape/Extract French Lyrics:** Extract all 353 hymns from Cantiquest.org.
2.  **Scrape/Extract English Lyrics:** Extract all hymns from the Little Flock (1881) collection.
3.  **Validate JSON:** Ensure no missing verses or malformed strings.

### Phase 2: Core Integration
1.  **Update `library.ts`**: Register the new collections.
2.  **Update `SearchScreen`**: Ensure the collection filter (if enabled) allows selecting between RW, FR, and EN.
3.  **Update `SongDetailScreen`**: Ensure the screen can handle the metadata from different collections.

### Phase 3: Cross-Language Mapping
1.  **Create `src/crossLanguageMap.json`**:
    ```json
    {
      "hymnes-rw:1": {
        "fr": "hymnes-fr:1",
        "en": "hymnes-en:301"
      }
    }
    ```
2.  Add a "Switch Language" icon in the `SongDetailScreen` header to jump between translations of the same hymn.

---

## 6. Challenges & Solutions
- **Non-1:1 Mapping:** Not all Kinyarwanda hymns have a direct English/French counterpart. We will use a mapping file to handle these exceptions.
- **Copyright:** Both collections (1991 HeC and 1881 Little Flock) are widely used in assemblies, but we must verify the public domain status for specific translations. (The 1881 edition is public domain).
