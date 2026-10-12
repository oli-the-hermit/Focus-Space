# Changelog

Every release of Focus Space, newest first. The app shows the short version in **Help → What's new**; this file keeps the full record, including the work under the hood. Focus Space is in **alpha**: features and looks may still change before the final version.

Versions follow [Semantic Versioning](https://semver.org): the middle number goes up when features are added, the last one for fixes. **1.5** is planned as the first final (non-alpha) version.

## 1.3.0 (alpha)

A new look and new ways to organize your task lists.

### What's new

- **Navigation drawer.** It floats in its own panel with the page margin around it, tinted with the accent color you pick in Appearance (a dark lime for Solar Lime, a matching tint for each of the 32 colors). The logo tile opens and closes it; when it's open, FOCUS SPACE sits as an overline at the top, and the account badge spans the bottom with a chevron. Hovers and the account menu use the same tint.
- **Session card.** The session's name sits under a *Session* overline with the count of tasks left beside it, and a ⋮ menu: add a task list, collapse or expand all, open in Tasks, edit the session.
- **Task lists on the timer page.** Each list has a *Task list* overline over a pill-shaped list switcher with its count inside, its collapse toggle next to its ⋮, and even spacing between the progress, the add field and the tasks. Drag a list by its header to reorder the session's lists.
- **List picker.** Add a task list from a new picker: a loose search (any word order, accents ignored), four sort orders, your recently opened lists on top, and a row that creates the name you typed. With no lists left to add, it suggests names.
- **Recently opened.** Every list switcher shows the last three lists you opened first.
- **Task rows.** Each row sits in its own subtle container with an always-visible drag handle, and its actions moved into a ⋮ menu (the same items as right-click), in the mini player too.
- **Goals.** A clearer card: the title like a reward's, and a Complete button that turns into Done.
- **One look for controls.** Switches, check boxes, segmented controls and dropdowns are shared components; dropdowns and their menus have pill shapes and round chevrons.
- **Wide windows.** A 12-column layout with equal margins; Goals and Rewards use it first.

### Under the hood

- **Design system groundwork** (for Pastel Studio, the design system shared by my apps, in progress): every inline control became a `components/ui` primitive (Switch, Checkbox, SegmentedControl, InputChip, Toast, Collapsible, NavigationRail, WindowButton, PlayerControl, QueueItem, ListRow, StatusChip, AvatarPicker, EmojiField, ListPicker, ...), with a `surface` prop so a control stays one step above whatever it sits on.
- **Guardrails** so that stays true: an ESLint rule fails when a component's CSS class is used outside `components/ui`, raw `<button>`/`<input>` elements are rejected there, and `npm run audit:inline` fails when feature CSS restyles a component (deliberate exceptions say why in a comment).
- **Tokens:** `--drawer-bg` and its hover steps are derived from the accent's hue with CSS relative colors; `--row-bg`, `--grip-color` and the chevron fill are a step darker than their surface. A test checks text, icons and focus rings on the drawer for all 32 accents in both themes. Neutral mixes use `oklab` (mixing near-greys in `oklch` tinted them red).
- **Loose matching** in `lib/fuzzy.ts`, with tests; recently opened lists in `lib/recentLists.ts` (per device).
- **Drag and drop:** `useDragReorder` only reacts to drags it started, so a list panel and its task rows never answer each other's drags.
- **Checks:** 101 unit tests, 18 browser behavior checks and 84 screenshots per theme compared pixel by pixel on every change.

## 1.2.0 (alpha)

The first public version.

- Focus sessions with task lists, a calendar, stats, goals and rewards. Everything stays on your device, encrypted.
- Pick your accent color from 32 Space colors in Appearance, in light or dark.
- Notifications show what happened at a glance, with a color, an icon and a dot on the bell.
- An emoji picker for rewards, with search and your recent picks.
- A mini player you can resize, with your session tasks: add, tick, rename and reorder them there.
- Clocks count in minutes, so an hour-long session starts at 60:00.
- Alerts when a phase ends, keyboard shortcuts and a quick tour you can replay from Help.
- Desktop: updates install themselves. Turn the notices off in Settings → Updates.
