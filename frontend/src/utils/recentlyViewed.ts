const STORAGE_KEY = 'rigbuilder-recently-viewed';
const MAX_ITEMS = 20;

interface RecentItem {
  id: string;
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string | null;
  timestamp: number;
}

export function addRecentlyViewed(item: Omit<RecentItem, 'timestamp'>) {
  const existing = getRecentlyViewed();
  const filtered = existing.filter(e => e.id !== item.id);
  const updated = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail if storage is full
  }
}

export function getRecentlyViewed(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearRecentlyViewed() {
  localStorage.removeItem(STORAGE_KEY);
}
