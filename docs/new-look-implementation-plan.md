# Hymnes et Cantiques - New Look Implementation Plan

## 1. Objective
Implement the **Mobile App Redesign** look and UX into the existing React Native app in `/src`, with priority on:
- Bottom tabs: **Home, Search, Favorites, Library**
- **Recent songs** tracking and display
- Upgraded screens and reusable components aligned with redesign behavior

This plan is based on scanning:
- `Mobile App Redesign/src/app/**` (routes, screens, context, components)
- current app files in `src/**` and `App.tsx`

## 2. Current vs Target

### Current app (React Native)
- Single stack navigator in `App.tsx`
- Main screens: `SongList`, `SongDetail`, `FavoriteSongs`, `Splash`
- Favorites persistence exists in `src/favorites.ts` (song-id list)
- Song dataset and collection helpers in `src/library.ts`

### Redesign app (Web prototype)
- Route-based screens: Home, Search, Favorites, Collections, SongDetail, Splash
- Bottom navigation with 4 tabs
- Context state for current collection, recent songs, favorite categories
- Modal sheets: quick number, add-to-favorites, manage category
- Stronger visual system (maroon + neutral tokens)

## 3. Target Navigation Architecture (React Native)

### 3.1 Navigation structure
Use nested navigators:
1. `RootStackNavigator`
2. `MainTabsNavigator` (Home, Search, Favorites, Library)
3. Shared `SongDetail` screen in root stack (opened from any tab)

### 3.2 Proposed route map
- `Splash` (initial)
- `MainTabs`
  - `HomeTab`
  - `SearchTab`
  - `FavoritesTab`
  - `LibraryTab`
- `SongDetail` (push from any tab)

## 4. State and Persistence Plan

Create a unified app state layer for redesign features:
- `currentCollectionId`
- `recentSongIds` (max 20, deduped, newest first)
- `favoriteCategories` (future-ready)

### Storage keys (AsyncStorage)
- `app_current_collection_id`
- `app_recent_song_ids`
- `app_favorite_categories`

Keep compatibility with existing favorites migration logic in `src/favorites.ts`.

## 5. Implementation Workstreams

## 5.1 Foundation
- Add tab navigation dependency setup (if missing): bottom tabs + safe area integration
- Introduce shared theme tokens/constants (`src/theme.ts`)
- Add shared types for recent songs and favorite categories

## 5.2 Home Tab (new)
- Replace current SongList-first entry with Home layout inspired by redesign:
  - Header with collection + language indicator
  - Search launcher
  - Recent section
  - Browse section with list/grid toggle
  - Quick number action button
- Reuse existing song list logic from `SongListScreen` where possible

## 5.3 Search Tab (new)
- Dedicated `SearchScreen` tab
- Real-time filtering by song number/title/subtitle
- Empty states and result count
- Open `SongDetail` from results

## 5.4 Favorites Tab (upgrade)
Phase 1 (required for parity now):
- Keep existing favorites list behavior
- Restyle screen to redesign look

Phase 2 (enhancement):
- Add category-based favorites management (create/rename/delete)
- Add song-to-category flow from SongDetail

## 5.5 Library Tab (new)
- New screen for collection/language switching
- Active collection indicator
- Persist selected collection
- Drive Home/Search/Favorites content by selected collection

## 5.6 Song Detail (upgrade)
- Keep existing verse rendering improvements and repeat-marker highlighting
- Align visual structure with redesign:
  - Better header actions
  - cleaner verse/chorus blocks
  - favorite action sheet entry point
- Keep previous/next navigation support

## 5.7 Recent songs
- Add `trackRecentSong(song_id)` call when opening SongDetail
- Show top 3-6 recents on Home
- Handle empty state gracefully

## 6. File-by-File Execution Plan

### New files to add
- `src/navigation/MainTabsNavigator.tsx`
- `src/navigation/RootNavigator.tsx`
- `src/HomeScreen.tsx`
- `src/SearchScreen.tsx`
- `src/CollectionsScreen.tsx` (Library tab)
- `src/appState.ts` (or `src/context/AppContext.tsx`)
- `src/recentSongs.ts` (if separated from appState)
- `src/components/BottomTabBar.tsx` (optional custom tab bar)
- `src/components/SongCard.tsx`
- `src/components/QuickNumberSheet.tsx`

### Existing files to refactor
- `App.tsx`
  - switch from single stack to root+tabs architecture
- `src/SongListScreen.tsx`
  - split responsibilities; keep reusable list/filter parts for Home/Search
- `src/FavoriteSongsScreen.tsx`
  - become Favorites tab content or be wrapped by it
- `src/SongDetailScreen.tsx`
  - align UI and hook into recent songs tracking
- `src/library.ts`
  - ensure selected collection is used consistently

## 7. Delivery Phases

## Phase 1: Navigation + Core Tabs (Home/Search/Favorites/Library)
- Implement root stack + tabs
- Move current list/search/favorites into tabs
- Library tab with basic collection switch
- SongDetail reachable from all tabs

## Phase 2: Home UX + Recent + Quick Number
- Home redesign layout
- recent songs persistence + display
- quick number modal and navigation

## Phase 3: Favorites and Library Enhancements
- category model (optional but recommended)
- add/manage category sheets
- polish collection metadata UX

## Phase 4: Visual Polish + QA
- tokenized colors/spacing/typography
- interaction states and empty states
- device QA (small Android, large Android, iOS)

## 8. Acceptance Criteria
- App opens to Splash then Main Tabs
- Bottom tabs work: **Home, Search, Favorites, Library**
- Search tab finds songs by number/title
- Home shows recent songs after opening details
- Library tab changes active collection across tabs
- SongDetail opens from Home/Search/Favorites and supports favorite toggle
- No regressions in existing favorites persistence

## 9. Risks and Mitigations
- Risk: Mixing old and new navigation causes route confusion
  - Mitigation: Introduce `RootNavigator` and migrate screen-by-screen
- Risk: State scattered across screens
  - Mitigation: centralize with one app state module/context
- Risk: Category favorites migration complexity
  - Mitigation: ship phase 1 with existing favorite song IDs, add categories in phase 3

## 10. Suggested First Implementation Slice
Start with the smallest complete vertical slice:
1. Add tab navigator skeleton
2. Wire Home/Search/Favorites/Library placeholders
3. Open SongDetail from Home and track recents
4. Replace placeholders progressively with redesigned screens
