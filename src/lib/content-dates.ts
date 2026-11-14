import { getCollection } from 'astro:content';
export function contentDate(data: { published: Date; updated?: Date }): Date {
  return data.updated && data.updated > data.published ? data.updated : data.published;
}
export function formatDate(date: Date): string { return date.toISOString().slice(0, 10); }
export type ContentScope = 'all' | 'research' | 'notes' | 'cve' | 'ai-security';
export async function latestContentDate(scope: ContentScope = 'all'): Promise<Date | undefined> {
  const [research, notes] = await Promise.all([
    getCollection('research', ({ data }) => !data.draft),
    getCollection('notes', ({ data }) => !data.draft),
  ]);
  const entries = scope === 'research' ? research
    : scope === 'notes' ? notes
    : scope === 'cve' ? research.filter(({ data }) => Boolean(data.cve))
    : scope === 'ai-security' ? [...research.filter(({ data }) => data.category === 'ai-security'), ...notes.filter(({ data }) => data.topic.includes('AI'))]
    : [...research, ...notes];
  return entries.map(({ data }) => contentDate(data)).sort((a, b) => b.valueOf() - a.valueOf())[0];
}
