# Hymnes et Cantiques App: Features and UI Documentation

## 1. App Overview

Hymnes et Cantiques is a React Native + Expo application for browsing and reading Kinyarwanda hymns.  
It supports Android/iOS and web export, with Firebase Hosting configured for web deployment.

Primary user goal:
- Quickly find a hymn by number or title.
- Open full hymn content.
- Save favorite hymns for fast access later.

## 2. Technology Stack

- Framework: React Native (`0.71.8`) + Expo (`~48.0.18`)
- Language: TypeScript (`.tsx` screens; minimal strict TS config)
- Navigation: `@react-navigation/native` + `@react-navigation/stack`
- UI components: `@rneui/base` SearchBar
- Storage: `@react-native-async-storage/async-storage`
- Gestures/icons: `react-native-gesture-handler`, `react-native-vector-icons`
- Web hosting: Firebase Hosting (`web-build` folder)
- Build system: Expo CLI + EAS profiles

## 3. High-Level App Flow

1. App starts.
2. A custom splash screen is shown for 5 seconds.
3. User lands on Song List screen.
4. User can:
- Search by hymn title or exact number.
- Open hymn details.
- Open favorites list.
5. In hymn details, user can add/remove the hymn from favorites.
6. In favorites screen, user can open a favorite hymn or swipe to remove it.

## 4. Navigation Structure

Stack navigator screens:
- `SongList`
- `SongDetail`
- `FavoriteSongs`

Global header style:
- Background color: `#733752`
- Header text color: white
- Header title weight: bold

## 5. Screen-by-Screen Features and UI

## 5.1 Splash Screen (`src/SplashScreen.tsx`)

### Functional behavior

- Displayed during startup while `isLoading` is true.
- Hidden after `setTimeout(..., 5000)` in `App.tsx`.

### UI details

- Full-screen solid background `#733752`.
- Vertical layout split into:
- Top content centered (`Hymnes et Cantiques`, `(Kinyarwanda)`, `1 Corinthiens 14:15`).
- Bottom credits text (`Developed by Marius Ngaboyamahina`).
- Typography:
- Title: 32, bold, white.
- Subtitle: 24, white.
- Verse reference: 18, white, top margin.
- Credits: 14, white.

## 5.2 Song List Screen (`src/SongListScreen.tsx`)

### Functional behavior

- Loads all songs from local `src/songs.json`.
- Loads favorites from AsyncStorage key `favorites`.
- Search behavior:
- Matches if title contains query (case-insensitive).
- Matches if song number equals the trimmed query exactly.
- Tapping a song opens `SongDetail` with full route params:
- `title`, `song_number`, `verses`, `sub_title`, `songs`.
- Header right heart icon navigates to `FavoriteSongs`.

### UI details

- Header title: `Hymnes et Cantiques` (large bold style).
- Search input:
- RNE SearchBar.
- Placeholder text: `Andika numero cg title...`.
- White background with elevation/shadow.
- Song list:
- `FlatList` rendered as 5-column grid (`numColumns={5}`).
- Each song shown as circular button (`50x50`, `borderRadius: 25`).
- Default item:
- White background.
- Number text bold, `#733752`.
- Favorite item (if in AsyncStorage favorites):
- Background changes to `#733752`.
- Number text changes to white.

## 5.3 Song Detail Screen (`src/SongDetailScreen.tsx`)

### Functional behavior

- Receives selected song via route params.
- Updates navigation header title to: `<song_number>.<title>`.
- Loads favorite status from AsyncStorage.
- Favorite toggle button:
- If not favorite: label `Add to Favorites`.
- If favorite: label `Remove from Favorites`.
- Persists updates back to AsyncStorage key `favorites`.
- Includes helper logic for next/previous song lookup, but no active swipe UI currently triggers this logic.

### Verse rendering behavior

Each verse block is processed line-by-line with formatting rules:
- Lines containing `R:/`:
- `R:/` is highlighted in accent style.
- Remaining line text follows normal style.
- Lines beginning with numeric pattern `^\d+\.`:
- Verse number is highlighted in accent style.
- Verse text follows normal style.
- Other lines:
- Words `(ter)` and `(bis)` are highlighted in accent style.

### UI details

- Base background: white.
- Subtitle:
- Centered, italic, bold, 12px, color `#733752`.
- Verse text:
- Main verse font size: 18.
- Verse number: bold, 18, color `#733752`.
- Singing instruction markers (`R:/`, `(ter)`, `(bis)`):
- Bold italic, size 12, color `#733752`.
- Favorite button:
- Full-width style block near bottom.
- Background `#733752`, white bold label text.

## 5.4 Favorite Songs Screen (`src/FavoriteSongsScreen.tsx`)

### Functional behavior

- Reads favorites from AsyncStorage key `favorites`.
- Filters `songs.json` to only favorite song numbers.
- Renders favorites as tappable list items.
- Tapping item opens `SongDetail` with same route structure as Song List.
- Swipe action:
- Uses `Swipeable`.
- Right action shows trash icon button.
- Pressing trash removes hymn from favorites and persists storage.

### UI details

- List item card:
- White background, centered text, rounded corners, elevation.
- Text style: bold, 18, color `#733752`.
- Empty state:
- Message `No favorites yet` in centered accent color.
- Swipe delete button:
- Background `#733752`.
- White trash icon.

## 6. Data Layer and Content Model

Primary dataset:
- File: `src/songs.json`
- Shape per record:
- `song_number: number`
- `title: string`
- `sub_title: string`
- `verses: string[]`

Observed dataset stats:
- Total hymns: `271`
- Number range: `1` to `271`
- Songs with subtitle present: `270`
- Song without subtitle: `124`
- Maximum verse blocks in one song: `7`

Additional content files:
- `songs_v2.json` exists in project root but is not imported by screens.
- `Hymnes_et_Cantinques.pdf` exists in project root but is not used at runtime by current code.

## 7. State Management and Persistence

- Local React state inside each screen.
- Persistent favorites storage:
- Key: `favorites`
- Storage medium: AsyncStorage
- Data format: JSON array of song numbers (e.g., `[1, 5, 120]`)

Behavioral note:
- Favorites are loaded on initial mount of list/favorites screens.
- Song list favorite highlighting depends on loaded favorites array.

## 8. Visual Language (Current UI System)

Dominant accent color:
- `#733752` used across header, highlights, buttons, and delete/favorite actions.

General style direction:
- White content surfaces/cards on white base.
- Accent color used for semantic emphasis (song numbers, interaction actions, highlighted liturgical cues).
- Bold typography on key navigational and content metadata.
- Dense hymn text layout optimized for reading long lyric content.

## 9. Build, Distribution, and Hosting

Package scripts:
- `start`: `expo start --dev-client`
- `android`: `expo run:android`
- `ios`: `expo run:ios`
- `web`: `expo start --web`
- `predeploy`: `expo export:web`
- `deploy-hosting`: `npm run predeploy && firebase deploy --only hosting`

Firebase Hosting:
- Hosting target: `hymnes-et-cantiques-app` (from `.firebaserc`)
- Public directory: `web-build`
- Rewrite all routes to `/index.html` (SPA behavior)
- Cache headers:
- Global `no-cache, no-store, must-revalidate`
- Static assets: `max-age=604800`

EAS build profiles (`eas.json`):
- `development`: dev client, internal distribution
- `preview`: staging release channel, Android APK build
- `production`: production release channel

GitHub Actions workflows:
- PR preview deploy: `.github/workflows/firebase-hosting-pull-request.yml`
- Merge deploy to live: `.github/workflows/firebase-hosting-merge.yml`

## 10. Important Implementation Notes and Gaps

1. README claims left/right swipe navigation in Song Detail.
2. Current `SongDetailScreen` contains `handleSwipe` logic but no active gesture wiring that triggers it.
3. `Swipeable` and `MaterialIcons` imports in `SongDetailScreen` are currently unused for visible navigation controls.
4. GitHub workflow files run `npm run build`, but `package.json` currently has no `build` script. CI deploy jobs may fail unless that script is added or workflow command is updated.

## 11. Suggested Documentation Use

This document can be used as:
- Product feature reference for stakeholders.
- UI behavior baseline before redesign/refactor.
- QA checklist foundation (search, favorites persistence, song rendering rules).
- Onboarding guide for new developers touching navigation, storage, or hymn formatting logic.

