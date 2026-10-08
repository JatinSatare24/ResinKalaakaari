// Pure list operations for the admin photo list (no React, no Supabase), so
// they can be tested on their own. The list is ordered: the FIRST photo is the
// main photo, the rest are the extras in the order shown. Every function
// returns a NEW array and never changes the one it was given.

// Adds photos at the end, up to `max` in total. Returns how many were left out
// because the list was full, so the form can tell the owner. A link already in
// the list is ignored (the same photo twice is never allowed).
export function addPhotos(
  list: string[],
  urls: string[],
  max: number,
): { list: string[]; skipped: number } {
  const fresh = urls.filter((url, i) => {
    return !list.includes(url) && urls.indexOf(url) === i;
  });
  const room = Math.max(0, max - list.length);
  const added = fresh.slice(0, room);
  return { list: [...list, ...added], skipped: fresh.length - added.length };
}

// Moves one photo a single place: -1 = up (towards the main photo), +1 = down.
// Moving past either end changes nothing.
export function movePhoto(
  list: string[],
  index: number,
  direction: -1 | 1,
): string[] {
  const target = index + direction;
  if (index < 0 || index >= list.length) return [...list];
  if (target < 0 || target >= list.length) return [...list];
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// "Make main": the photo goes to the front and everything that was before it
// moves down one place, so the rest of the order is kept.
export function makeMain(list: string[], index: number): string[] {
  if (index <= 0 || index >= list.length) return [...list];
  return [list[index], ...list.slice(0, index), ...list.slice(index + 1)];
}

// Removes one photo. Removing the main photo makes the next one the main.
export function removePhoto(list: string[], index: number): string[] {
  if (index < 0 || index >= list.length) return [...list];
  return [...list.slice(0, index), ...list.slice(index + 1)];
}
