import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site?: URL }) {
  const research = (await getCollection('research', ({ data }) => !data.draft)).sort((a,b)=>b.data.published.valueOf()-a.data.published.valueOf());
  return rss({
    title: 'AN7LN Security',
    description: '漏洞研究、技术笔记与负责任披露记录。',
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
