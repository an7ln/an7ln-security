import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const research = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(['web', 'api', 'mobile', 'code-audit', 'ai-security']),
    tags: z.array(z.string()).default([]),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info', 'research']),
    cwe: z.string().optional(),
    cve: z.string().regex(/^CVE-\d{4}-\d{4,}$/).optional(),
    vendor: z.string().optional(),
    product: z.string().optional(),
    disclosure: z.object({
      status: z.enum(['research', 'reported', 'triaged', 'fixed', 'published']),
      vendorConfirmed: z.boolean().default(false),
    }).optional(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    topic: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['active', 'maintained', 'experiment', 'archived']),
    stack: z.array(z.string()).default([]),
    repository: z.url().optional(),
    order: z.number().default(99),
    draft: z.boolean().default(false),
  }),
});

export const collections = { research, notes, projects };
