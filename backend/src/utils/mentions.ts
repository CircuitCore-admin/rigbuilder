/** Extract @username mentions from markdown text */
export function extractMentions(text: string): string[] {
  const regex = /@([a-zA-Z0-9_-]+)/g;
  const mentions = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    mentions.add(match[1]);
  }
  return Array.from(mentions);
}
