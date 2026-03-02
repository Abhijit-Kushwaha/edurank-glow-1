# BrainBuddy Rebrand + Remove Calling Feature

This plan covers two major changes: (1) removing all video/audio calling functionality while keeping chat, and (2) a complete rebrand from "EduRank" to "BrainBuddy" with a new color system and redesigned UI.

---

## Part 1: Remove Calling Functionality

### Files to Delete

- `src/hooks/useVideoCall.ts` -- entire WebRTC call hook
- `src/components/friends/VideoCallDialog.tsx` -- call UI dialog
- `src/components/friends/IncomingCallDialog.tsx` -- incoming call UI

### Files to Edit (remove call references)

- **`src/pages/Friends.tsx`** -- Remove `useVideoCall` import/usage, remove Video/Phone buttons from friend list and chat header, remove `VideoCallDialog` and `IncomingCallDialog` renders, remove `callDialogOpen` state and `handleStartCall`/`handleAnswerCall` functions
- **`package.json`** -- Remove `@100mslive/react-sdk` dependency (no longer needed)

### What Stays

- Chat (`ChatWindow`, `useChat`, `ShareContentDialog`) -- fully preserved
- Friend management (`useFriends`, `FriendSearch`, `InviteFriend`) -- fully preserved
- Online presence (`usePresence`, `OnlineIndicator`) -- fully preserved
- `FriendsWidget` on dashboard -- preserved (already chat-only)

---

## Part 2: Full Rebrand to BrainBuddy

### Brand Identity

- **Name**: BrainBuddy (everywhere)
- **Tagline**: "BrainBuddy -- Your AI Friend for Learning and Problem Solving"
- **Personality**: Friendly, student-focused, AI-powered, clean

### New Color System

| Token            | Value              | Usage                        |
| ---------------- | ------------------ | ---------------------------- |
| Primary Blue     | #2563EB            | Buttons, links, accents      |
| Secondary Purple | #7C3AED            | Secondary actions, gradients |
| Accent Pink      | #EC4899            | AI buddy highlights only     |
| Accent Cyan      | #22D3EE            | Progress, hover, animations  |
| Dark Background  | #0B0F19            | Page background              |
| Card Surface     | #111827            | Cards, panels                |
| Text Gray        | #9CA3AF            | Muted text                   |
| White            | #FFFFFF            | Primary text                 |
| Primary Gradient | #2563EB to #7C3AED | Hero, CTAs, neon text        |

### Files to Update

#### Global Theme (`src/index.css`)

- Replace all CSS custom properties (both `:root` and `.dark`) with the new blue-purple color palette
- Update neon glow colors from green to blue
- Update gradient definitions to use blue-to-purple
- Update scrollbar styling to match new primary

#### Tailwind Config (`tailwind.config.ts`)

- Update keyframe glow colors to match new blue primary
- No structural changes needed (colors come from CSS vars)

#### HTML Meta (`index.html`)

- Title: "BrainBuddy -- Your AI Friend for Learning and Problem Solving"
- Update all meta descriptions, OG tags, twitter tags
- Update author to "BrainBuddy"
- Update favicon references
- Update canonical URL reference

#### Logo Component (`src/components/Logo.tsx`)

- Change text from "EduRank" to "BrainBuddy"
- Update icon composition to feel more friendly/buddy-like (e.g., use `Brain` + `Sparkles` icons)

#### Landing Page (`src/pages/Index.tsx`)

- Headline: "Solve Any Problem with BrainBuddy"
- Subtext: "Chat, learn, and grow with your AI study partner"
- CTA: "Start Learning Free"
- Update feature cards:
  1. AI Chat -- Instant problem solving
  2. Smart Notes -- AI-generated study notes
  3. Interactive Quizzes -- Test and track progress
- Update footer copyright to BrainBuddy
- Remove "Watch Demo" button or keep as secondary CTA

#### Auth Page (`src/pages/Auth.tsx`)

- Update feature preview labels at bottom if needed
- Uses Logo component so name updates automatically

#### About Page (`src/pages/About.tsx`)

- Change "About EduRank" to "About BrainBuddy"
- Update description text to reflect BrainBuddy identity

#### Profile Page (`src/pages/Profile.tsx`)

- Change "About EduRank" button text to "About BrainBuddy"

#### Study Reminders (`src/hooks/useStudyReminders.ts`)

- Change notification title from "EduRank Study Reminder" to "BrainBuddy Study Reminder"

#### Button Variants (`src/components/ui/button.tsx`)

- Update `neon` variant glow to use new blue-purple gradient (handled via CSS vars, but verify)

#### Friends Page (`src/pages/Friends.tsx`)

- Already uses Logo component, will update automatically after Logo change

### Navigation Structure

The current nav works well. No major structural changes are needed since there is no separate "Video Call" or "Audio Call" page to remove. The calling was embedded in the Friends page only.

---

## Technical Details

### Color Conversion (HSL values for CSS custom properties)

The new dark theme values will be derived from the provided hex colors:

- `--background`: ~225 40% 5% (from #0B0F19)
- `--card`: ~222 30% 10% (from #111827)
- `--primary`: ~217 91% 53% (from #2563EB)
- `--secondary`: ~263 70% 58% (from #7C3AED)
- `--accent` (pink): ~330 81% 60% (from #EC4899)
- `--muted-foreground`: ~218 11% 65% (from #9CA3AF)
- Gradient: `linear-gradient(135deg, #2563EB, #7C3AED)`

### Light theme

Will also be updated to use blue/purple as the base palette instead of green, ensuring consistency.

### Animations

- Glow effects transition from green-teal to blue-purple
- Pulse animations keep the same timing, just new colors

### What is NOT changing

- Database schema (no migration needed)
- Chat functionality
- Quiz system
- Notes system
- Video player
- Authentication flow
- Dashboard layout structure
- Leaderboard
- All backend edge functions
