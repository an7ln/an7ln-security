import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

export const prerender = true;

export const GET: APIRoute = async () => {
  const [research, notes, projects] = await Promise.all([
    getCollection('research', ({ data }) => !data.draft),
    getCollection('notes', ({ data }) => !data.draft),
    getCollection('projects', ({ data }) => !data.draft),
  ]);
  const items = [
    ...research.map((entry) => ({ title: entry.data.title, excerpt: entry.data.description, type: '研究', url: `/research/${entry.id}/` })),
    ...notes.map((entry) => ({ title: entry.data.title, excerpt: entry.data.description, type: '现场笔记', url: `/notes/${entry.id}/` })),
    ...projects.map((entry) => ({ title: entry.data.title, excerpt: entry.data.description, type: '项目', url: '/projects/' })),
  ];
  return new Response(JSON.stringify(items), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
