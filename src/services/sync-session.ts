// Tracks which signed-in user owns the local/cloud progress data.
// Kept in its own module so both the progress and lesson services can read it
// without importing each other (avoids circular dependencies).
let syncUserId: string | null = null;

export function setSyncUserId(uid: string | null) {
  syncUserId = uid;
}

export function getSyncUserId() {
  return syncUserId;
}
