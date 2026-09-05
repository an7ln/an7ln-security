import { getCollection } from 'astro:content';
export function contentDate(data: { published: Date; updated?: Date }): Date {
  return data.updated && data.updated > data.published ? data.updated : data.published;
}
export function formatDate(date: Date): string { return date.toISOString().slice(0, 10); }
export async function latestContentDate(): Promise<Date | undefined> {
  const [research, notes] = await Promise.all([
    getCollection('research', ({ data }) => !data.draft),
    getCollection('notes', ({ data }) => !data.draft),
  ]);
  return [...research, ...notes].map(({ data }) => contentDate(data)).sort((a, b) => b.valueOf() - a.valueOf())[0];
}
