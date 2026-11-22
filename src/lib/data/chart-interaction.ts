export function togglePinned<T>(current: T | null, next: T): T | null {
  return current === next ? null : next;
}

export function emphasizedStage<T>(pinned: T | null, preview: T | null): T | null {
  return preview ?? pinned;
}
