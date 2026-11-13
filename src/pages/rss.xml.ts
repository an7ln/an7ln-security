import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { site, siteTitle } from '../config/site';

export async function GET(context: { site?: URL }) {
  const research = (await getCollection('research', ({ data }) => !data.draft)).sort((a,b)=>b.data.published.valueOf()-a.data.published.valueOf());
  return rss({
    title: siteTitle,
    description: site.description,
    site: context.site ?? 'https://qqyln.cn',
    items: research.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.published,
      link: `/research/${entry.id}/`,
      categories: [entry.data.category, ...entry.data.tags],
    })),
  });
}
