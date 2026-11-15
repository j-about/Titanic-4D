/**
 * Distance by which a scrolling box must move its content for an item to show inside a frame, by
 * the shortest way: negative to scroll back, positive to scroll on, zero when the item is inside
 * already. An item longer than the frame is aligned on the start of the frame. The four values
 * are positions along the same axis.
 */
export function scrollDistanceToReveal(
  itemStart: number,
  itemEnd: number,
  frameStart: number,
  frameEnd: number,
): number {
  if (itemStart < frameStart || itemEnd - itemStart > frameEnd - frameStart) {
    return itemStart - frameStart;
  }
  return itemEnd > frameEnd ? itemEnd - frameEnd : 0;
}
