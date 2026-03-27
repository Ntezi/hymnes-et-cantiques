# Hymnes et Cantiques - Mobile App Redesign

A modern, elegant mobile application for browsing, searching, reading, and organizing Christian hymns and songs. Built with React, TypeScript, and Tailwind CSS.

## 🎨 Design Philosophy

### Sacred & Modern
- **Maroon Color Palette**: Church-book inspired maroon (#6d3549) as primary color, creating a sacred yet contemporary feel
- **Warm & Calm**: Soft neutrals and warm accents ensure a peaceful worship experience
- **Premium Feel**: Refined shadows, smooth transitions, and thoughtful spacing

### Accessibility First
- **High Contrast**: WCAG-compliant color ratios for readability
- **Touch-Friendly**: 44×44px minimum tap targets for easy mobile interaction
- **Readable Typography**: 
  - Inter for UI elements (clean, modern)
  - Crimson Pro for song lyrics (elegant serif for long-form reading)

### Cross-Platform Neutral
- Not iOS-specific or Android-specific
- Universal mobile design patterns
- Works great on any device

## 📱 Features

### Core Functionality
1. **Browse & Search**
   - Search by song number or title
   - Quick number jump with number pad
   - Grid and list view options
   - Recent songs tracking

2. **Song Reading**
   - Optimized for worship use
   - Clear verse numbering
   - Highlighted chorus/refrain sections
   - Beautiful serif typography for lyrics

3. **Favorites Management**
   - Create custom favorite categories
   - Add songs to multiple categories
   - Rename and delete categories
   - Visual category organization

4. **Multi-Collection Support**
   - Switch between collections
   - Multiple languages (Kinyarwanda, Ewe, etc.)
   - Different song types (hymns, praise songs, etc.)
   - Scalable architecture

### User Experience
- **Smooth Navigation**: React Router for seamless transitions
- **Persistent State**: LocalStorage for favorites and recent songs
- **Empty States**: Thoughtful messaging when no content exists
- **Loading States**: Graceful content appearance
- **Interactive Feedback**: Hover, active, and pressed states

## 🏗️ Architecture

### Technology Stack
- **React 18.3** - Component-based UI
- **TypeScript** - Type safety
- **React Router 7** - Client-side routing
- **Tailwind CSS v4** - Utility-first styling
- **Lucide React** - Icon system
- **LocalStorage** - Client-side persistence

### Project Structure
```
src/app/
├── screens/           # Main app screens
│   ├── SplashScreen.tsx
│   ├── HomeScreen.tsx
│   ├── SongDetailScreen.tsx
│   ├── SearchScreen.tsx
│   ├── FavoritesScreen.tsx
│   └── CollectionsScreen.tsx
├── components/        # Reusable components
│   ├── BottomNav.tsx
│   ├── SongCard.tsx
│   ├── AddToFavoriteSheet.tsx
│   ├── ManageCategorySheet.tsx
│   ├── QuickNumberSheet.tsx
│   └── DesignSystemDoc.tsx
├── context.tsx        # Global state management
├── data.ts           # Mock song data
├── types.ts          # TypeScript definitions
└── routes.tsx        # App routing

src/styles/
├── theme.css         # Design tokens & color palette
├── fonts.css         # Typography imports
├── index.css         # Global styles
└── tailwind.css      # Tailwind imports
```

## 🎯 Key Screens

### 1. Splash Screen
- Brand identity with app icon
- Scripture reference (1 Corinthiens 14:15)
- Smooth auto-transition to home

### 2. Home Screen
- Prominent search bar
- Recent songs section
- Browse all songs (list/grid view)
- Floating quick-number button
- Bottom navigation

### 3. Song Detail Screen
- Clean, focused reading experience
- Song number badge
- Title and subtitle
- Verse numbering
- Highlighted chorus/refrain
- Favorite categories badges
- Add to favorites action

### 4. Search Screen
- Real-time search
- Search by number or title
- Result count display
- Empty state guidance

### 5. Favorites Screen
- Category management
- Create new categories
- Rename/delete categories
- Category song previews
- Empty state onboarding

### 6. Collections Screen
- Switch between song collections
- Language selection
- Song count display
- Active collection indicator

## 🎨 Design System

### Color Palette

**Maroon Primary**
- 900: #5c2a3f (darkest)
- 800: #6d3549 (primary)
- 700: #7e4053
- 600: #8f4b5d
- 500: #a05667
- 400: #b17181
- 300: #c28c9b
- 200: #d3a7b5
- 100: #e4c2cf
- 50: #f5e0e9 (lightest)

**Neutral Grays**
- 900: #1a1a1a (darkest)
- 800: #333333
- 700: #4d4d4d
- 600: #666666
- 500: #808080
- 400: #999999
- 300: #b3b3b3
- 200: #cccccc
- 100: #e6e6e6
- 50: #f5f5f5
- 25: #fafafa (lightest)

### Typography

**Headings & UI**
- Font: Inter
- Weights: 400 (regular), 500 (medium), 600 (semibold)
- Usage: Navigation, buttons, labels, headings

**Song Lyrics**
- Font: Crimson Pro (serif)
- Size: 18px (1.125rem)
- Line Height: 1.75 (relaxed)
- Usage: Song text for optimal readability

### Components

**Buttons**
- Primary: Maroon 800 background, white text
- Secondary: Neutral 100 background, neutral text
- Outline: White background, neutral border
- Border radius: 12px (rounded-xl)
- Padding: 12-16px vertical, 24px horizontal

**Cards**
- Background: White
- Border: 1px neutral-200
- Radius: 12-16px
- Shadow: subtle (shadow-sm to shadow-md)

**Inputs**
- Background: Neutral 50
- Border: Neutral 200
- Focus: Maroon 300 border + maroon ring
- Radius: 12px

### Spacing System
- Base unit: 4px (0.25rem)
- Common spacings: 4, 8, 12, 16, 20, 24, 32, 48px
- Container padding: 20px (px-5)
- Section spacing: 24px (py-6)

### Border Radius
- Small: 8px (rounded-lg)
- Medium: 12px (rounded-xl)
- Large: 16px (rounded-2xl)
- Circle: 50% (rounded-full)

## 🔄 State Management

### Context API
The app uses React Context for global state:
- Current collection selection
- Favorite categories (CRUD operations)
- Recent songs tracking
- Search query state

### LocalStorage Persistence
- Favorite categories saved automatically
- Recent songs preserved across sessions
- Collection preference remembered

## 📊 Data Structure

### Song
```typescript
{
  id: string;
  number: number;
  title: string;
  subtitle?: string;
  collection: string;
  language: string;
  type: string;
  verses: Verse[];
}
```

### Verse
```typescript
{
  number?: number;
  type: 'verse' | 'chorus' | 'refrain';
  lines: string[];
}
```

### FavoriteCategory
```typescript
{
  id: string;
  name: string;
  songIds: string[];
  createdAt: Date;
}
```

## 🚀 Future Enhancements

1. **Backend Integration**
   - User accounts & cloud sync
   - Cross-device favorites
   - Community song sharing

2. **Advanced Features**
   - Offline mode
   - Audio playback
   - Transpose lyrics
   - Print/PDF export
   - Dark mode

3. **Social Features**
   - Share songs
   - Song requests
   - Comments & notes

4. **Accessibility**
   - Font size controls
   - Screen reader optimization
   - High contrast mode

## 📝 Usage Guidelines

### Adding New Songs
1. Add song data to `src/app/data.ts`
2. Follow the Song type structure
3. Include all verses with proper type markers

### Adding New Collections
1. Add collection to `collections` array in `data.ts`
2. Set unique ID, name, language, and song count
3. Filter songs by collection ID

### Customizing Colors
1. Edit CSS variables in `src/styles/theme.css`
2. Update maroon and neutral color scales
3. Adjust theme tokens as needed

## 🎯 Design Principles

1. **Sacred but Modern**: Traditional worship meets contemporary design
2. **Content First**: Song text is the hero, UI supports it
3. **Touch Optimized**: Designed for mobile-first interaction
4. **Calm & Focused**: Minimal distractions during worship
5. **Scalable**: Ready for multiple collections and languages

## 📱 Responsive Behavior

The app is optimized for mobile portrait orientation (max-width: 448px / 28rem) but scales gracefully:
- Centered content container
- Touch-friendly 44px tap targets
- Readable 16px base font size
- Adequate spacing for thumb navigation

## 🎨 Brand Identity

- **App Icon**: Book symbol on maroon background
- **Primary Action**: Maroon 800
- **Accent**: Warm gold for special moments
- **Scripture**: "1 Corinthiens 14:15"
- **Developer**: Marius Ngaboyamahina

---

**Built with care for modern worship experiences** 🙏
