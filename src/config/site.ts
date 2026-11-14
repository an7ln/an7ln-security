export const site = {
  name: 'AN7LN Security',
  registeredName: '浅笑新柔',
  tagline: '漏洞研究与 AI 安全',
  description: 'AN7LN Security（浅笑新柔）专注 Web、API、移动端与 AI 安全研究，公开记录技术笔记、负责任披露与实战工具。',
} as const;

export const siteTitle = `${site.name}｜${site.registeredName} · ${site.tagline}`;

export function pageTitle(title?: string): string {
  return title ? `${title}｜${site.name} · ${site.registeredName}` : siteTitle;
}

export const navigation = [
  { label: '首页', href: '/', index: '001', archiveLabel: '首页', contentScope: 'research' },
  { label: 'CVE', href: '/cve/', index: '002', archiveLabel: 'CVE', contentScope: 'cve' },
  { label: '笔记', href: '/notes/', index: '003', archiveLabel: '笔记复盘', contentScope: 'notes' },
  { label: 'AI 安全', href: '/ai-security/', index: '004', archiveLabel: 'AI 安全', contentScope: 'ai-security' },
  { label: '关于', href: '/about/', index: '005', archiveLabel: '关于', contentScope: 'all' },
] as const;
