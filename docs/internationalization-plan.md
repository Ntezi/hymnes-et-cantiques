# App Internationalization (i18n) Plan

## 1. Goal
Implement a robust internationalization (i18n) framework to support the app interface in **Kinyarwanda**, **French**, and **English**. This is separate from the lyrics/songs language support and focuses on UI elements like menus, buttons, labels, and placeholders.

---

## 2. Technical Stack

### 2.1. Recommended Libraries
- **`i18next`**: The core translation framework.
- **`react-i18next`**: React bindings for i18next.
- **`expo-localization`**: To detect the user's device language automatically.

### 2.2. Installation
```bash
npx expo install expo-localization i18next react-i18next
```

---

## 3. Directory Structure

Translations will be stored in a dedicated folder:
```text
src/
└── i18n/
    ├── index.ts          # i18n configuration & initialization
    └── locales/
        ├── rw.json       # Kinyarwanda strings
        ├── fr.json       # French strings
        └── en.json       # English strings
```

---

## 4. Implementation Steps

### Phase 1: Setup & Configuration
1.  **Initialize i18next**: Create `src/i18n/index.ts` to configure the fallback language and load local JSON files.
2.  **Language Detection**: Use `expo-localization` to set the initial language based on the phone's settings.
3.  **App Integration**: Wrap the root component (in `App.tsx`) with the `I18nextProvider`.

### Phase 2: String Externalization
1.  **Extract Strings**: Identify all hardcoded strings in the project (e.g., "Search", "Favorites", "Recent", "Settings").
2.  **Populate Locales**:
    - `en.json`: `{ "search": "Search", "favorites": "Favorites" }`
    - `rw.json`: `{ "search": "Shakisha", "favorites": "Ibyatoranyijwe" }`
    - `fr.json`: `{ "search": "Rechercher", "favorites": "Favoris" }`
3.  **Refactor Components**: Replace hardcoded text with the `t()` function from `useTranslation()`.

### Phase 3: Language Switching UI
1.  **Settings Screen**: Add a "Language" section where users can manually override the system language.
2.  **Persistence**: Save the user's manual language choice in `AsyncStorage` so it persists after the app restarts.
3.  **Dynamic Update**: Ensure the UI updates immediately when the language is changed without requiring a restart.

---

## 5. UI Elements to be Internationalized
- **Tab Bar Labels**: Home, Search, Favorites, Settings.
- **Headers**: Page titles (e.g., "Song Details").
- **Search Placeholders**: "Search by number or title...".
- **Buttons**: "Play", "Pause", "Save", "Cancel", "Delete".
- **Empty States**: "No favorites yet", "No results found".
- **Modals/Sheets**: "Add to Favorites", "Manage Categories".

---

## 6. Maintenance & Best Practices
- **Keys Naming**: Use descriptive, nested keys (e.g., `common.cancel`, `search.placeholder`).
- **Pluralization**: Use i18next's built-in pluralization support for things like "5 Songs" vs "1 Song".
- **Missing Keys**: Enable "debug" mode in development to highlight missing translation keys.
