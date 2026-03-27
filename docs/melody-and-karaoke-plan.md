# Melody Playback and Karaoke-Style Lyrics Plan

## 1. Goal
Implement audio playback of melodies for hymns and synchronized "karaoke-style" highlighting of lyrics in the **hymnes-cantiques** app. This will allow users to learn the tunes while following the text, similar to the Spotify lyrics experience.

---

## 2. Technical Stack & Requirements

### 2.1. Libraries
- **`expo-av`**: For cross-platform audio playback (MP3/AAC).
- **`react-native-reanimated`**: For smooth highlighting transitions (already in `package.json`).
- **`AsyncStorage`**: To cache melody preferences or downloaded files (already in `package.json`).

### 2.2. Data Sourcing (Melodies)
Since the Kinyarwanda "Hymnes et Cantiques" (HeC) collection shares many melodies with the original French collection, we will:
1.  **Map RW Songs to FR Melodies**: Create a mapping (e.g., `RW 1` uses melody from `FR 1`).
2.  **Source URLs**: Dynamically link to high-quality MP3s from repositories like `cantiquest.org` or `eblc.ch`.
3.  **Metadata**: Store melody URLs and timing data in a new `src/melodyMetadata.json`.

---

## 3. Data Architecture

### 3.1. Timing Data Structure
Each song needs a timing file or entry to know when to highlight each line.
```typescript
interface SongTiming {
  song_id: string;
  verses: {
    verse_index: number;
    lines: {
      line_index: number;
      start_ms: number;  // Milliseconds from start
      end_ms: number;    // Milliseconds from start
    }[];
  }[];
}
```

### 3.2. Melody Mapping
```typescript
interface MelodyMap {
  [rw_song_number: number]: {
    melody_url: string;      // URL to MP3/MIDI
    french_ref?: number;     // Reference to the French HeC number
    has_timing: boolean;     // Whether karaoke data is available
  };
}
```

---

## 4. UI/UX Components

### 4.1. `SongDetailScreen` Enhancements
- **Audio Control Bar**: A floating or header-integrated bar with Play/Pause, Stop, and a Progress Slider.
- **Synchronized Highlighting**: 
  - The active line will be visually distinct (e.g., increased opacity, different color, or subtle background).
  - **Auto-scroll**: As the song progresses, the `ScrollView` should automatically center the active verse.

### 4.2. New Components
- `MelodyPlayerControl`: A reusable component for handling `expo-av` logic.
- `HighlightedText`: A specialized text component that monitors playback position and updates its style.

---

## 5. Implementation Phases

### Phase 1: Infrastructure (Foundation)
1.  **Install Dependencies**: `npx expo install expo-av`.
2.  **Audio Service**: Create `src/services/audioService.ts` to wrap `expo-av` functionality (Load, Play, Pause, Seek).
3.  **Sample Data**: Create a prototype timing file for Song #1 (`TURAGUSINGIZA DATA`) to test synchronization.

### Phase 2: UI Implementation
1.  **Player UI**: Add the Play/Pause button to `SongDetailScreen`.
2.  **Highlighting Logic**: 
    - Use `setInterval` or `onPlaybackStatusUpdate` from `expo-av` to track current time.
    - Pass `currentTime` down to `renderLine` in `SongDetailScreen`.
3.  **Styling**: Define `styles.activeVerseLine` for the highlighted state.

### Phase 3: Data Mapping & Scaling
1.  **Melody Mapping**: Compile the list of URLs for all 350+ hymns.
2.  **Timing Generation**: 
    - *Option A (Manual)*: Use a tool to generate `.lrc` files.
    - *Option B (Automated)*: Explore AI-based alignment (forced alignment) to generate timestamps for the entire collection.

### Phase 4: Advanced Features
1.  **Offline Mode**: Allow users to download melodies for offline use.
2.  **Melody Selection**: For songs with multiple traditional tunes, allow the user to switch between them.
3.  **Speed Control**: Allow users to slow down the melody while learning.

---

## 6. Testing Strategy
- **Synchronization Test**: Verify that the highlight moves exactly with the audio across different devices.
- **Resource Management**: Ensure audio resources are released when the user navigates away from the song.
- **Network Resilience**: Handle buffering and slow connections gracefully for streamed melodies.
