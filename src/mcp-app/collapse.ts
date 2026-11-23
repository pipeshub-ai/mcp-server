// Which citations the card lists before the person asks for the rest. A long
// answer cites 15-20 sources, and the card listed every one, pushing the
// answer far below it. The card now lists the first few and a "+N more" link.

/** Citations listed while the card is collapsed. */
export const COLLAPSED_CITATIONS = 3;

/**
 * The citations to list, and the label of the link that toggles the rest
 * (`undefined`: no link). One citation beyond the cut is listed rather than
 * hidden behind a "+1 more" link that takes the same space.
 */
export function visibleCitations<T>(
  all: readonly T[],
  expanded: boolean,
): { shown: readonly T[]; toggle?: string } {
  if (all.length <= COLLAPSED_CITATIONS + 1) return { shown: all };
  return expanded
    ? { shown: all, toggle: "Show fewer" }
    : { shown: all.slice(0, COLLAPSED_CITATIONS), toggle: `+${all.length - COLLAPSED_CITATIONS} more` };
}
