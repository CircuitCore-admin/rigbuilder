import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api';

export interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  manufacturer: string;
  category: string;
  avgRating: number | null;
  images: string[];
  affiliateLinks: Array<{ retailer: string; url: string; price: number }>;
  isBundle: boolean;
}

export interface SearchBuild {
  id: string;
  name: string;
  slug: string;
  userName: string;
  upvoteCount: number;
  totalCost: number;
}

export interface SearchThread {
  id: string;
  title: string;
  slug: string;
  category: string;
  userName: string;
  replyCount: number;
}

export interface SearchResults {
  products: SearchProduct[];
  builds: SearchBuild[];
  threads: SearchThread[];
}

/**
 * Debounced instant search hook.
 * Debounces to 200ms to avoid hammering the server during typing.
 * Returns empty results until the user has typed at least 2 characters.
 */
export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults>({ products: [], builds: [], threads: [] });
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ products: [], builds: [], threads: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    const timer = setTimeout(async () => {
      // Cancel previous request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const data = await api<SearchResults>(
          `/search?q=${encodeURIComponent(query.trim())}&limit=5`,
          { signal: abortRef.current.signal }
        );
        setResults(data);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setResults({ products: [], builds: [], threads: [] });
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
}
