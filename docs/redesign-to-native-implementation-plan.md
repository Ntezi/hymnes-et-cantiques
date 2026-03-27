# Hymnes et Cantiques: Redesign-to-Native Implementation Plan

This plan outlines the steps to migrate the web-based mobile app redesign (from `/Mobile App Redesign`) into the React Native (Expo) project in `/src`.

## 1. Goal
Implement a modern, "sacred maroon" theme with improved UX, specifically focusing on:
- **Tabs**: Home, Search, Favorites, Library.
- **Recent Songs**: Persistent tracking and display.
- **New Look**: Gradient headers, rounded cards, and improved typography.
- **Enhanced UX**: Quick-number jump, category-based favorites, and collection switcher.

---

## 2. Technical Foundation (React Native)

### 2.1 UI/UX Architecture
- **Navigation**: Continue using `@react-navigation/native`, `@react-navigation/stack`, and `@react-navigation/bottom-tabs`.
- **Layout**: Use `Flexbox` within `View` and `SafeAreaView`.
- **Styling**: Standard `StyleSheet` objects, using centralized theme tokens.
- **Icons**: Use `react-native-vector-icons/Ionicons` for consistency with current app.
- **Persistence**: Use `@react-native-async-storage/async-storage`.

### 2.2 Shared Theme (Proposed `src/theme.ts`)
```typescript
export const COLORS = {
  maroon: {
    800: '#6d3549',
    700: '#7e4053',
    600: '#8f4b5d',
    50: '#f5e0e9',
  },
  neutral: {
    900: '#1a1a1a',
    600: '#666666',
    400: '#999999',
    200: '#e6e6e6',
    100: '#f5f5f5',
    25: '#fafafa',
  },
  white: '#ffffff',
};
```

---

## 3. Implementation Phases

### Phase 1: Navigation & State Foundation
1.  **Update `App.tsx`**: Ensure the 4-tab structure (Home, Search, Favorites, Library) is correctly styled with the new colors.
2.  **Update `src/appState.tsx`**:
    - Add `recentSongIds: string[]` to the context state.
    - Implement `addRecentSong(id: string)` with max limit (20) and persistence.
    - Update `selectedCollectionId` management to ensure it filters content across all tabs.

### Phase 2: Screen Redesigns

#### 2.1 Home Screen (`src/SongListScreen.tsx`)
- **Header**: Gradient background (use `View` with bg color if `expo-linear-gradient` is not installed).
- **Recent Section**: Horizontal `FlatList` of the last accessed songs.
- **Browse Section**: Integrated `SongList` with a cleaner list/grid toggle.
- **FAB**: Add a floating `TouchableOpacity` for "Quick Jump" (Number entry).

#### 2.2 Search Screen (`src/SearchScreen.tsx`)
- **UI**: Full-screen search with a persistent input and real-time result list.
- **Logic**: Search by song number, title, and lyrics.

#### 2.3 Favorites Screen (`src/FavoriteSongsScreen.tsx`)
- **Categories**: Introduce simple category filtering (e.g., "Sabbath", "Prayer").
- **List**: Redesigned `SongCard` list with a heart toggle.

#### 2.4 Library/Collections Screen (`src/CollectionsScreen.tsx`)
- **Switcher**: Clean list of available collections (Kinyarwanda, Ewe, etc.).
- **Metadata**: Display song counts and language labels.

#### 2.5 Song Detail Screen (`src/SongDetailScreen.tsx`)
- **Verse Styling**: Improved spacing, highlighted chorus sections.
- **Actions**: Better header icons for "Add to Favorite", "Share", and "Text Resize".

### Phase 3: Interactive Components
1.  **`SongCard`**: Create a reusable component with compact/large variants.
2.  **`QuickNumberModal`**: Implement a modal with a number pad for fast song entry.
3.  **`CollectionIndicator`**: Add small badges showing which collection/language is active.

---

## 4. Specific Mappings (Web -> Native)

| Redesign (Web) | Native (React Native) |
| :--- | :--- |
| `div` (flex col) | `View` (style={{ flex: 1 }}) |
| `button` (variant) | `TouchableOpacity` or `Pressable` |
| `lucide-react` | `react-native-vector-icons/Ionicons` |
| `localStorage` | `AsyncStorage` |
| `Sheet` (Radix) | `Modal` or `ActionSheetIOS` / `BottomSheet` libraries |
| `tailwind` colors | `StyleSheet` with `COLORS` constants |

---

## 5. Acceptance Criteria
1.  **Tabs**: 4 clearly labeled and styled tabs are functional.
2.  **Recents**: Recently viewed songs appear on the Home screen and persist after restart.
3.  **Theme**: The "Sacred Maroon" theme is consistent across all screens.
4.  **Performance**: Large song lists (200+) scroll smoothly using `FlatList`.
5.  **Responsiveness**: Layout works on both small phones and large tablets.
