import { useEffect, useRef, type RefObject } from 'react';

/**
 * IntersectionObserver hook that adds a `.visible` class (via data-attribute)
 * to each child section once it scrolls into view.
 *
 * Usage: pass the returned ref to a wrapper element whose direct children
 * should animate in.  Each child gets `data-reveal="true"` once visible.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced-motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Immediately reveal everything
      Array.from(el.querySelectorAll('[data-reveal]')).forEach((child) => {
        (child as HTMLElement).dataset.reveal = 'true';
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.reveal = 'true';
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    const children = el.querySelectorAll('[data-reveal]');
    children.forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  return ref;
}
