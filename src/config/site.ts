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
