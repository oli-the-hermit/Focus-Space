# Focus Space — UX patterns

Interaction rules every screen follows. Visual rules (color, type, spacing) live in the tokens
(`src/styles/foundation/tokens.css`); words live in [`microcopy.md`](microcopy.md).

## Drag to reorder

One mechanism (native drag and drop through `hooks/useDragReorder`, with `lib/reorder.moveById`),
two presentations, chosen by what a click on the item does:

| Item | A click… | Shows | Cursor | Examples |
|---|---|---|---|---|
| **Row** | selects or opens it | a grip (⋮⋮) at its left edge, visible on hover and focus | pointer over the row, grab over the grip, grabbing while held | sessions, task lists, tasks |
| **Card** | does nothing by itself (its controls act) | no grip, so the card keeps even padding | grab over the card's free area, grabbing while held | goals, calendar events |

- The pointer always wins over the hand: buttons, check boxes and text fields inside a card keep
  their own cursor, and dragging selected text out of a field never moves the card.
- While dragging, the item fades to `surface-3` and the drop target shows an accent line on top
  (`components/drag.css`: `.dragging`, `.drag-over`).
- The new order saves with the profile; nothing else changes (no toast).
- Classes: rows use `draggable-item` + `ui/QueueItem` (or a `drag-handle` grip); cards use
  `draggable-item drag-surface`.

## Tools that appear on hover

Row tools (edit, duplicate, delete) show on hover and on keyboard focus. When a row has a details
line they sit on it; otherwise they float over the row's end on the row's own hover color, so they
never take room from the name (`ui/QueueItem`, landmark rows).
