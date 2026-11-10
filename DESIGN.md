# Skuld: Core Design & Experience System (DESIGN.md)

This document formalizes the **9 Design & Experience Tenets** required for the Skuld mobile personal OS. Every UI component, screen, animation, and interaction must strictly conform to these rules.

---

## The 9 Tenets of Skuld Experience

### 1. Zero-Friction Agent Accessibility
- **Rule**: Talking to any agent must be reachable in **<= 1 tap or gesture from anywhere** in the app.
- **Implementation**:
  - The floating **Quick-Capture HUD bar** and **1x1 expander pill** remain globally anchored or one-swipe summonable across all dashboards.
  - Tapping the mic instantly activates `AudioCaptureService` with haptic feedback; tapping text instantly focuses the prompt bar.

### 2. Nordic Elemental Aesthetic
- **Rule**: Distinct, premium Nordic atmosphere rooted in myth and elemental textures—strictly avoid generic "AI purple gradients".
- **Color Palette Tokens**:
  - `Midnight Obsidian (Deep Void)`: `#0a0a12` (Base background)
  - `Glacial Cyan (Destiny Glow)`: `#00e5ff` (Primary luminescent accent, active states, runic glow)
  - `Frost Silver / Titanium`: `#dce4ec` (Borders, primary typography, emblem highlights)
  - `Aurora Violet (Subtle Atmospheric)`: `#6b21a8` / `#3b0764` (Nebula undertones)
  - `Card Surface`: `#12121c` with `#1e1e2d` borders (Translucent dark slate with 1px runic micro-stroke)
  - `Muted Slate`: `#64748b` (Secondary labels, metadata)

### 3. Silky Smooth Transitions & Fluid Loading
- **Rule**: Zero jarring jumps, zero cumulative layout shifts (CLS < 0.05).
- **Implementation**:
  - Screen transitions use smooth shared-element or subtle slide/fade (200ms - 280ms cubic-bezier).
  - Data loaders use frosted shimmer skeleton placeholders rather than generic centered spinners.

### 4. Navigable, Readable Dashboards with Direct Deep-Links
- **Rule**: Dashboards must be clean, scannable at a glance, and fully interactive.
- **Implementation**:
  - Hero glanceable cards (e.g. Butler daily briefing, Health steps/hydration rings, Chef dinner card, PM next milestone).
  - **Every card or widget is directly tappable** to immediately drill down into its dedicated deep-dive view or modal.

### 5. Snappy, Meaningful Animations (150ms - 300ms)
- **Rule**: Animations must communicate state and feel natural without delaying the user.
- **Constraints**:
  - Micro-interactions (press down, toggle, checkbox): 150ms spring or ease-out.
  - Sheet presentations / dialogs: 250ms.
  - Support `prefers-reduced-motion` globally.

### 6. Expressive, Living Agent Avatars (Real-time Speech Synchronization)
- **Rule**: Avatars must not feel static. They must be animated characters that react dynamically when speaking.
- **Implementation**:
  - Idle state: Subtle breathing rhythm, ambient eye glow.
  - Thinking state: Pulsing runic aura / halo.
  - Speaking state: Viseme-driven mouth-flap synchronized with streaming audio buffers (`AnimatedAvatarStage.tsx`).

### 7. Instant AI Response Reflection (<300ms Perceived TTFT)
- **Rule**: Text and voice responses must stream in immediately.
- **Implementation**:
  - Token streaming with early clause/punctuation chunking via `LocalLLMEngine`.
  - The UI displays streamed tokens word-by-word with typing cursor while the neural TTS pipeline synthesizes audio in parallel.

### 8. Frictionless In-Place Editing
- **Rule**: Editing items (tasks, calendar events, reminders, expenses, recipes) must be fast and intuitive.
- **Implementation**:
  - Inline tap-to-edit for text fields, swipe-to-delete/complete gestures, and auto-saving sheets with immediate local optimistic updates.

### 9. Modular, Decoupled Architecture (Zero Cross-Feature Risk)
- **Rule**: Adding, modifying, or removing any agent or capability must never crash or destabilize other features.
- **Implementation**:
  - All communication is routed through `AgentBusService` using strongly-typed, schema-validated queries (`askAgent`) and domain events (`publishEvent`).
  - Sub-features (e.g. `OCREngineService`, `CameraScannerService`) are stateless shared utilities that accept custom parameter profiles.
  - An agent without a particular capability simply does not register that handler; consumers handle fallback responses gracefully.

---

## Screen & Domain Dashboard Architecture

```
                    +---------------------------------+
                    |     Global Quick-Capture HUD    |
                    |  (One-tap voice / text summon)  |
                    +---------------------------------+
                                     |
     +-------------------------------+-------------------------------+
     |                                                               |
     v                                                               v
+---------------------------+                       +---------------------------+
|     Living Avatar Stage   |                       |    Active Agent Switcher  |
|  (Viseme Mouth Flap /     |                       |    & Bottom Navigation    |
|   Full Runic Idle Glow)   |                       | (Butler, PM, Accounts,    |
+---------------------------+                       |  Health, Prof, Chef, +)   |
                                                    +---------------------------+
                                     |
       +-----------------------------+-----------------------------+
       |                             |                             |
       v                             v                             v
+---------------+             +---------------+             +---------------+
|  Butler View  |             |   PM Board    |             | Accounts View |
| - Daily Brief |             | - Kanban/List |             | - Spending Bar|
| - Schedule Cal|             | - Milestones  |             | - Recurring   |
| - Reminders   |             | - Focus Block |             | - OCR Scan CTA|
+---------------+             +---------------+             +---------------+
       |                             |                             |
       v                             v                             v
+---------------+             +---------------+             +---------------+
|  Health View  |             |Professor View |             |   Chef View   |
| - Vitals Rings|             | - Roadmaps    |             | - Daily Meal  |
| - Med Tracker |             | - SM-2 Cards  |             | - Recipe Deck |
| - Workouts    |             | - Streak Card │             | - Timers/List |
+---------------+             +---------------+             +---------------+
```
