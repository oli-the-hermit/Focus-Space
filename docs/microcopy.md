# Focus Space — Microcopy & System States

The single reference for every user-facing message in Focus Space: what the app says, where it says it, and what the user can do next. The source of truth for the text itself is [`src/constants/strings.ts`](../src/constants/strings.ts), including every server error: both backends ([`server/app.js`](../server/app.js) and its Rust port) send only an error **code**, and the frontend shows `strings.errors.api[code]`.

## Voice guide

| Principle | In practice |
|---|---|
| **Keep people informed** (Nielsen #1) | Every action that changes data confirms itself; every wait says what it's waiting for ("Opening your space…", "Setting things up…"). |
| **Calm, never alarming** | No "Fatal", "Failed", "Invalid", "Error", "Danger". Say what happened in plain words and, when it matters, that their data is safe. |
| **Always a way forward** | Every problem message ends with the next step: *try again*, *sign in*, *pick another date*, *remove one to add someone new*. |
| **Short and human** | One idea per sentence. Contractions are fine. Toasts are a single line. |
| **No decorative emoji** | UI glyphs come from the stroke icon set in `AppIcons.tsx`. Emoji appear only where the **user** picked them for a reward. |
| **Sentence case everywhere** | Buttons, labels, titles, menu items and tooltips capitalize only the first word and proper nouns: "Save changes", "Change password", "Notification settings", "Star on GitHub". Never Title Case. |

**Word swaps**

| Instead of | Say |
|---|---|
| Failed / Could not | We couldn't … / … didn't … this time |
| Invalid username or password | That username and password don't match |
| Are you sure you want to delete …? | Delete "…"? This can't be undone. |
| Overdue | Past due |
| Danger Zone | Permanent actions |
| Internal server error | Something unexpected happened on our side. Your data is safe … |
| Exit | Sign out |

**The wizard nod.** First-run setup has one small nod to classic installation wizards: *"One quick step, no Next › Next › Finish required."* The success toast then reads *"Setup complete, no restart required."* That's the only Easter egg. Don't add more.

**Reading the table**
- **Toasts** render one line of text with no title or button. For toasts, *Semantic Title* is the intent (for docs and accessibility), and *Suggested Action* points to a control already on screen.
- **Placeholders** such as `{name}` are filled at runtime.
- ***(needs wiring)*** marks a state the app doesn't announce yet. The copy is ready, but the behavior still needs to be built. These strings are **not** in `strings.ts` yet.
- ***(inactive)*** marks the Agenda view, whose components exist but aren't currently rendered.

---

## First run & sign-in

| Feature Context / Trigger | Category | UI Component | Semantic Title | Message Body | Suggested Action / CTA |
|---|---|---|---|---|---|
| First launch, no account yet | Status | Screen header | Let's set up Focus Space | One quick step, no Next › Next › Finish required. This main account looks after every profile on this device. | Create main account |
| Setup submitting | Status | Button label | Setting up | Setting things up… | — (button disabled) |
| Setup complete | Success | Toast | Setup complete | Setup complete, no restart required. Your space is ready. | Start a session |
| Setup complete, earlier local data found | Success | Toast | Data brought over | Your earlier sessions and tasks came along. Everything's where you left it. | Keep going |
| Returning user | Status | Screen header | Welcome back | Sign in to pick up where you left off. | Sign in |
| Signing in | Status | Button label | Signing in | Signing in… | — |
| Restoring saved session on launch | Status | Full-screen status | Opening your space | Opening your space… | — |
| A window stops drawing (render crash) | Error Recovery | Full-screen card | Something unexpected happened | Focus Space stopped drawing this screen. Your saved data is safe. Reload to pick up where you left off. If it keeps happening, copy the details and include them when you report it. | Reload / Copy details |
| Local service not reachable yet (web) | Helpful Alert | Inline helper | Still connecting | Still connecting to the local app service. We'll keep trying every few seconds. If it takes a while, start it with npm run dev. | Retries automatically |
| Empty required field | Error Recovery | Inline helper | Missing details | A few fields are still empty. Fill them in to continue. | Complete the form |
| Username or password left empty (server) | Error Recovery | Inline helper | Missing details | Enter your username and password to continue. | Sign in |
| Password too short | Error Recovery | Inline helper | Password length | Passwords need at least 8 characters. Try adding a word or two. | Edit password |
| Passwords don't match | Error Recovery | Inline helper | Passwords differ | Those passwords don't match yet. Retype them to confirm. | Retype |
| Wrong username or password | Error Recovery | Inline helper | Couldn't sign in | That username and password don't match. Check for typos or Caps Lock and try again. | Try again |
| Too many attempts | Helpful Alert | Inline helper | Short pause | Too many sign-in attempts in a row. Take a short break and try again in 30 seconds. | Try again in 30 s |
| Main account already exists | Helpful Alert | Inline helper | Account exists | This device already has a main account. Sign in instead. | Already have an account? Sign in |
| Session ended (token missing, unknown or expired) | Helpful Alert | Inline helper | Signed out | Your session has ended. Sign in again to continue. | Sign in |
| Saved session couldn't be restored on launch *(needs wiring)* | Helpful Alert | Inline helper (login) | Please sign in again | For your security, your last session ended. Sign in to pick up where you left off. | Sign in |
| Request interrupted, no details | Error Recovery | Inline helper | Something interrupted that | Something interrupted that request. Please try again. | Try again |
| Request interrupted, status code only | Error Recovery | Inline helper | Something interrupted that | Something interrupted that request (code {status}). Please try again. | Try again |

## Profile & settings

| Feature Context / Trigger | Category | UI Component | Semantic Title | Message Body | Suggested Action / CTA |
|---|---|---|---|---|---|
| Username format | Error Recovery | Inline helper | Username format | Usernames use 3–24 characters: letters, numbers, dots, dashes or underscores. | Edit username |
| Display name length | Error Recovery | Inline helper | Name length | Display names can be 1–40 characters. | Edit name |
| Password length (server check) | Error Recovery | Inline helper | Password length | Passwords can be 8–128 characters. | Edit password |
| Username already used | Error Recovery | Inline helper | Username in use | That username is already in use. Try a different one. | Edit username |
| Photo over 1 MB (picked file) | Error Recovery | Inline helper | Photo too large | That image is over 1 MB. Try a smaller or cropped photo. | Change photo |
| Photo too large (server check) | Error Recovery | Inline helper | Photo too large | That image is too large. Try a smaller or cropped photo. | Change photo |
| Save pressed with no changes | Helpful Alert | Inline helper | No changes | No changes to save yet. | — |
| Profile saved | Success | Toast | Profile saved | Profile saved. | — |
| Current password missing | Error Recovery | Inline helper | Current password | Enter your current password to continue. | Enter password |
| Current password wrong | Error Recovery | Inline helper | Password check | That's not your current password. Give it another try. | Try again |
| New passwords differ | Error Recovery | Inline helper | Passwords differ | The new passwords don't match yet. Retype them to confirm. | Retype |
| New password length (server check) | Error Recovery | Inline helper | Password length | New passwords can be 8–128 characters. | Edit password |
| Password changed | Success | Toast | Password updated | Password updated. Other open sessions were signed out to keep things secure. | — |
| Password needed to confirm | Error Recovery | Inline helper | Confirm it's you | Enter your password to confirm. | Enter password |
| Password wrong on confirm | Error Recovery | Inline helper | Password check | That password doesn't match. Please try again. | Try again |
| Delete own profile: confirm | Helpful Alert | Inline panel | Delete my profile | This removes your profile and everything in it from this device. It can't be undone. | Delete / Cancel |
| Own profile deleted | Success | Toast | Profile deleted | Your profile has been deleted. | — |
| Own profile couldn't be deleted | Error Recovery | Inline helper | Didn't go through | We couldn't delete your profile. Please try again. | Try again |
| Main account tries to delete itself | Helpful Alert | Inline helper | Main account | The main account can't be deleted. It keeps every profile on this device running. | — |
| Profile limit reached | Helpful Alert | Inline helper | Profile limit | You've reached the limit of {max} profiles. Remove one to add someone new. | Remove a profile |
| Profile not found | Error Recovery | Inline helper | Profile not found | We couldn't find that profile. It may have been removed already. | Refresh the list |
| Create / rename / delete another profile didn't go through | Error Recovery | Inline helper | Didn't go through | We couldn't create / rename / delete that profile. Please try again. | Try again |
| Profile removed by main account | Success | Toast | Profile removed | Profile "{name}" removed. | — |
| No extra profiles | Empty State | Inline | No other profiles | No other profiles yet. Add one for anyone else who uses this device. | + Add profile |
| Section header for irreversible actions | Status | Section title | Permanent actions | Permanent actions | — |
| Reset profiles: confirm | Helpful Alert | Inline panel | Delete all user profiles? | Every profile except the main account will be removed, along with its goals, rewards and agenda. This can't be undone. | Confirm / Cancel |
| Reset profiles: password step | Helpful Alert | Inline panel | Confirm it's you | Enter your password to confirm. | Confirm |
| Reset done | Success | Toast | Profiles reset | User profiles reset ({count}) | — |
| Reset didn't go through | Error Recovery | Inline helper | Didn't go through | We couldn't reset the profiles. Please try again. | Try again |
| Main-account-only action | Helpful Alert | Inline helper | Main account only | Only the main account can do this. | — |
| Upload too big to save at once (web server) | Error Recovery | Inline helper | Too much at once | That's more than we can save at once. Try a smaller image or fewer changes. | Try again |
| Saved data couldn't be read or written | Error Recovery | Inline helper | Change not saved | We couldn't save that change. Your data is safe, so please try again. | Try again |
| Unexpected problem on the app service | Error Recovery | Inline helper | Unexpected hiccup | Something unexpected happened on our side. Your data is safe, so please try again. | Try again |
| Unknown address (desktop service) | Error Recovery | Inline helper | Not found | We couldn't find what you were looking for. | — |

## Timer, sessions & mini player

| Feature Context / Trigger | Category | UI Component | Semantic Title | Message Body | Suggested Action / CTA |
|---|---|---|---|---|---|
| Timer idle | Status | Status label | Ready | Ready | Start |
| Timer running (focus) | Status | Status label | Focusing | Focusing… | Pause |
| Timer running (break) | Status | Status label | On a break | On a break | Pause |
| Timer paused | Status | Status label | Paused | Paused | Start |
| No session picked | Empty State | Player card | No session | Pick a session to start | + New session |
| Focus phase ends | Success | Alert island (in-app, desktop popup or browser notification) | Focus session complete | Nice work. Time for a break. | Start break · Open app |
| Break ends | Status | Alert island | Break's over | Ready when you are. | Start focus · Open app |
| Focus phase ends, alerts turned off | Success | Toast | Focus complete | Focus session complete. Nice work, time for a break. | Start (break) |
| Break ends, alerts turned off | Status | Toast | Break over | Break's over. Ready when you are. | Start |
| Task checked off during a session | Success | Toast | Task done | Task done in {duration}. | Keep going |
| Session created | Success | Toast | Session saved | Session "{name}" is ready. | — |
| Session updated / duplicated / deleted | Success | Toast | Session saved | Session updated. · Session duplicated. · Session deleted. | — |
| No sessions | Empty State | Inline | No sessions | No sessions yet. Create one above to get started. | + New session |
| No task list attached to the session | Empty State | Inline | No task list | No task list for this session yet. Pick a list or create a new one. Lists are saved, so any session can reuse them. | Choose a task list… |
| Mini player didn't open | Error Recovery | Toast | Mini player | The mini player didn't open this time. Try again, or keep going here. | Open mini player |
| Mini player waiting for the main window | Status | Mini window | Connecting | Connecting to Focus Space… | — |
| Auto-save didn't go through *(needs wiring)* | Helpful Alert | Toast | Changes not saved yet | We couldn't save your latest changes. We'll try again with your next edit. | Keep the app open |
| All changes saved *(needs wiring)* | Status | Status bar | Saved | All changes saved | — |

## Tasks & lists

| Feature Context / Trigger | Category | UI Component | Semantic Title | Message Body | Suggested Action / CTA |
|---|---|---|---|---|---|
| List created | Success | Toast | List saved | List "{name}" is ready. | — |
| List renamed / duplicated / deleted | Success | Toast | List saved | List renamed. · List duplicated. · List deleted. | — |
| Task updated | Success | Toast | Task saved | Task updated. | — |
| No lists | Empty State | Sidebar | No lists | No lists yet. Create one to get started. | + New list |
| No list selected | Empty State | Panel | Pick a list | Pick or create a list in the sidebar to start tracking tasks. | + New list |
| No tasks in list | Empty State | List body | No tasks | No tasks yet. Add your first one above. | Add |
| Delete a list | Helpful Alert | Modal | Delete list? | Delete "{name}"? This can't be undone. | Delete / Cancel |
| Delete a task / session / event | Helpful Alert | Modal | Delete session? · Delete | Delete "{name}"? This can't be undone. | Delete / Cancel |
| Delete (no specific item) | Helpful Alert | Modal | Delete item? | Delete item? This can't be undone. | Delete / Cancel |

## Calendar, agenda & notifications

| Feature Context / Trigger | Category | UI Component | Semantic Title | Message Body | Suggested Action / CTA |
|---|---|---|---|---|---|
| Event scheduled | Success | Toast | Scheduled | "{title}" is on your calendar. | — |
| Event moved by dragging | Success | Toast | Moved | Moved to {date} at {time}. | — |
| Event updated / duplicated / removed | Success | Toast | Event saved | Event updated. · Event duplicated. · Event removed. | — |
| Session started from the agenda *(inactive)* | Status | Toast | Session started | Starting "{title}". Settle in. | — |
| Nothing scheduled today *(inactive)* | Empty State | Card | Nothing scheduled | Nothing scheduled for today yet. Plan a focus block to give your day some shape. | + Schedule for today |
| All of today's sessions done *(inactive)* | Empty State | Hero card | All done | That's everything for today. Want another round? Use "+ Schedule for today". | + Schedule for today |
| Scheduled session coming up | Status | Alert island | Coming up at {time} | "{title}" starts in {minutes} min. | Start session · Open app |
| Browser permission granted (web) | Success | Permission row | Allowed | Allowed. Alerts reach you even when this tab is in the background. | — |
| Browser permission not asked yet (web) | Helpful Alert | Permission row | Allow notifications | Allow notifications so alerts reach you when this tab is in the background. | Allow notifications |
| Browser permission blocked (web) | Helpful Alert | Permission row | Blocked | Notifications are blocked for this site. Allow them from the icon next to the address, then reload. | — |
| Browser can't notify (web) | Status | Permission row | Not supported | This browser can't show notifications. Alerts still appear inside the app. | — |
| Notification settings saved | Success | Toast | Saved | Notification settings saved. | — |

## Onboarding tour & help

| Feature Context / Trigger | Category | UI Component | Semantic Title | Message Body | Suggested Action / CTA |
|---|---|---|---|---|---|
| First launch on a profile | Status | Tour, welcome slide | Hi {name}, welcome to Focus Space | A calm place to focus, one session at a time. Want a quick look around? It takes about a minute. | Show me around · Maybe later |
| Tour step (spotlight) | Status | Tour card | Chapter · {current} of {total} | One or two sentences per highlighted area (`strings.onboarding.steps`). | Back · Next · Close tour |
| Tour finished | Success | Tour, final slide | You're all set | Replay this tour anytime from Help, the ? at the top right. | Start focusing |
| Help hub | Status | Modal | Help | Take the tour · Keyboard shortcuts · What's new · About · Report a problem · Star on GitHub | — |
| About: privacy | Status | Panel | Your data stays here | Everything is stored on this device and encrypted with your password. Nothing is sent anywhere. | — |
| Shortcuts paused | Status | Helper text | Shortcuts paused | Shortcuts pause while you're typing or a dialog is open. | — |

## Menus & window

| Feature Context / Trigger | Category | UI Component | Semantic Title | Message Body | Suggested Action / CTA |
|---|---|---|---|---|---|
| Right-click on empty space | Status | Context menu | Actions | New session · New task list · New task · Schedule session · New goal · New reward · Start timer · Open mini player · Help and tutorial | — |
| Right-click on the player | Status | Context menu | Actions | Start timer / Pause timer · Reset timer · Skip to break / Skip to focus · Turn sound on / off · Open mini player · Edit session | — |
| Right-click on an item | Status | Context menu | Actions | The item's own actions, e.g. Start session · Edit · Duplicate · Delete, or Mark as complete / Mark as not done | — |
| Desktop title bar | Status | Window buttons | Window | Minimize · Maximize / Restore · Close | — |
| Profile form edited | Status | Footer button | Discard changes | Discard changes (shown only after an edit) | Save changes |
| Form edited (any other form modal) | Status | Footer button | Cancel | Cancel (shown only after an edit; the X closes an untouched form) | Primary action |

## Goals, stats & rewards

| Feature Context / Trigger | Category | UI Component | Semantic Title | Message Body | Suggested Action / CTA |
|---|---|---|---|---|---|
| Goal created | Success | Toast | Goal saved | Goal "{name}" is set. | — |
| Goal updated / duplicated / deleted | Success | Toast | Goal saved | Goal updated. · Goal duplicated. · Goal deleted. | — |
| Delete a goal | Helpful Alert | Modal | Delete goal? | Delete "{name}"? This can't be undone. | Delete / Cancel |
| No goals | Empty State | Grid | No goals | No goals yet. Set your first one. Small steps count too. | + New goal |
| Completion date before start date | Error Recovery | Inline helper | Date order | The completion date needs to be on or after the start date. | Pick another date |
| Goal or landmark past its date | Status | Badge | Past due | {count} day{s} past due | — |
| No completed tasks yet | Empty State | Stats card | No history yet | No completed tasks yet. Check off tasks during a session and your timing stats will show up here. | Go to timer |
| Reward unlocked *(needs wiring)* | Success | Toast | Reward unlocked | Reward unlocked: {name}. Claim it on the Rewards page whenever you like. | Rewards |
| Nothing ready to claim | Empty State | Column | Nothing to claim | Finish a session, landmark or goal to unlock your first reward. | + New reward |
| No rewards in progress | Empty State | Column | Nothing in progress | No rewards in progress yet. | + New reward |
| No claimed rewards | Empty State | Column | Nothing claimed | Claimed rewards will appear here. | — |
| Reward ready | Status | Button | Claim | Claim reward | Claim reward |
| Reward claimed | Success | Overlay | Reward claimed | You earned this one. Enjoy it. | Awesome! |
| Reward created | Success | Toast | Reward saved | Reward "{name}" is ready. | — |
| Reward updated / duplicated / deleted | Success | Toast | Reward saved | Reward updated. · Reward duplicated. · Reward deleted. | — |
| Delete a reward | Helpful Alert | Modal | Delete reward? | Delete "{name}"? This can't be undone. | Delete / Cancel |

---

## Implementation notes

- **Where the text lives.** All copy is in `strings.ts`, grouped by area. Notable groups:
  - `actions`: command labels shared by buttons, tooltips, menus and alerts that run the same command.
  - `toasts`: every confirmation toast.
  - `errors.api`: one message per server error code.
  - `frequency`, `shortcuts`, `keys`, `units`: labels for data values, keyboard help and duration units.

  The UI primitives in `components/ui` have their own small dictionary (`ui/UiLabels.tsx`: Close, Search…, Today…), which the app can override with `UiLabelsProvider`. ESLint rejects literal text in JSX and in `label`/`title`/`message`-style props.
- **Placeholders and plurals.** Fill `{placeholders}` with `format(template, vars)` from `src/lib/i18n.ts`, never `.replace()`. Anything with a count uses `{ one, other }` forms and `plural(count, forms)`. Dates use `LOCALE` from the same file; weekday names come from `weekdayNames()`.
- **Numbers inside messages come from limits.** Username, password and display-name lengths, the profile limit, the lockout time and the photo size are in `shared/limits.json`, which both backends and the frontend read. Messages take them as `{min}`, `{max}`, `{seconds}` and `{mb}`, so never type the number into a string.
- **Two backends, one voice.** A new server error needs a code in `server/errors.js` and `src-tauri/src/backend/errors.rs`, plus a message in `strings.errors.api`. `npm run audit:errors` checks all three; `npm run test:rust` runs the Rust tests.
- **Delete dialogs share one template.** `sessions.deleteConfirmPrompt` is used for sessions, lists, tasks, events, goals and rewards, so keep it generic. `modals.confirmDeleteDefaultMsg` must contain the word `item` exactly once, because the list sidebar swaps it for the list name.
- **Icons, not emoji.** The account menu uses `IconUser`, `IconSettings` and `IconLogOut`. Completion-log rows use `IconCheck`. Goal and landmark reward badges show that reward's own emoji.
- **To wire the *(needs wiring)* states:** add the strings to `strings.ts` first, then call them from:
  - the auto-save `catch` in `AppContext.tsx`, which today only logs to the console;
  - the bootstrap `catch`, which today falls back to the login screen silently;
  - the reward status change from `locked` to `ready`.
- **Alerts.** Phase-end and calendar alerts are built in `src/lib/notify.ts` and shown by `AlertCard` (in-app and in the desktop popup) or as a browser notification with action buttons (`public/notify-sw.js`).
- **Capitalization.** Sentence case for every string. Proper nouns (Focus Space, GitHub) keep their capitals; keyboard key names (Space, Shift) are shown as keys.
