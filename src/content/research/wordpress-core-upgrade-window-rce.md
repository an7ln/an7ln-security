---
title: "WordPress 核心升级窗口 RCE（CVE-2026-119977）：已在野探测，升级到修复版的「那一次」也要先封目录"
description: "WordPress 4.7–7.1.3 完整包核心升级的临时副本位于 Web 可达且命名可预测的目录，未认证者可在升级窗口内执行代码（CVSS 8.1，CISA KEV）。升级到 7.1.4 或分支修复版前，先在 Web 层禁止访问 wp-content/upgrade/，升级后排查异常账户与文件。"
published: 2026-11-08
updated: 2026-11-08
category: web
tags: [WordPress, CVE-2026-119977, TOCTOU, Race Condition, Core Update, KEV, Wordfence, Patch Management]
severity: high
cwe: CWE-367
cve: CVE-2026-119977
vendor: WordPress Foundation
product: WordPress Core
disclosure:
  status: fixed
  vendorConfirmed: true
featured: false
draft: false
---

> **WordPress 核心升级窗口 RCE**：问题不在某个插件，而在 WordPress 自己的核心升级流程。站内另一篇「窗口期」主题可对照 [HTTP/3 竞态窗口](/research/http3-race-windows/)。

## 执行摘要

结论先说：**这是一个「补丁本身要讲究打法」的漏洞。** WordPress 于 2026-10-28 发布 7.1.4 安全版，并向 4.7 起各分支回移修复；其中 [CVE-2026-119977](https://www.cve.org/CVERecord?id=CVE-2026-119977) 是核心升级流程中的 **TOCTOU 竞态（CWE-367）**：完整包升级时，含安装程序的新版本临时副本落在 **Web 可达、名称可预测** 的目录里，未认证者若在升级窗口内触达，可在服务器上执行代码。CVE 记录评分 **CVSS 3.1 8.1（High，AC:H）**；CISA 于 **2026-11-03** 将其列入 KEV。

第二个结论：**从受影响版本升级到修复版的那一次，执行的仍是旧升级器。** 发现者 Umut Bayram 的公开说明（经 The Hacker News 2026-11-06 转述）指出，5.9 及以上站点在这一次升级中临时目录名仍可预测。因此正确顺序是：**先在 Web 层禁止访问 `wp-content/upgrade/` 并确认返回 403 → 再升级 → 再排查**，而不是「等等再升」——窗口只在升级过程中存在，拖延不会让它更安全。

本文只整理厂商、CNA、CISA 与各国 CERT 公开材料中的失败模式、修复边界与防守清单；**不提供**目录命名规则、请求构造、安装程序的利用步骤或任何可复现细节。

![WordPress 核心升级窗口信任边界：触发升级 → 旧升级器解包 → Web 可达临时副本（升级窗口）→ 复制到位并删除；右侧为防守切点](/uploads/wordpress-core-upgrade-window-rce/upgrade-window-boundary.svg)

## 背景：为什么「升级流程」会成为攻击面

WordPress 核心更新（后台「立即更新」、自动后台更新，以及 WP-CLI 的 `wp core update`）都走同一套升级器：下载更新包，解包到 `wp-content/upgrade/` 下的临时目录，再把文件复制到位，最后删除临时副本。

问题在于两个假设叠加：

- **临时目录在 Web 根下面**，Web 服务器通常可以直接提供其中的文件；
- **完整包里带有 WordPress 安装程序**，而这份临时副本在被删除前，本身就是一个「尚未配置」的 WordPress。

只要临时目录的名字能被外部猜到，「只存在几秒的中间状态」就变成了一个对外暴露的未认证入口。这是典型的检查时与使用时不一致（TOCTOU）：升级器默认中间状态不会被外部触达，而部署环境并不保证这一点。

## 事实：漏洞类、评分与版本范围

以下来自 CVE 记录（CNA：Wordfence）、WordPress.org 发布公告与 NHS England、加拿大网络安全中心（CCCS）通告：

1. **描述（CVE 记录原意）**：WordPress Core 4.7 至 7.1.3 存在远程代码执行；原因是完整包核心升级使用了**可预测且 Web 可访问的暂存路径**，未认证攻击者可在升级窗口内于服务器上执行代码。
2. **弱点类型**：CWE-367（TOCTOU 竞态）。
3. **评分**：CVSS 3.1 **8.1（High）**，向量 `AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H`——网络可达、无需权限，但**攻击复杂度高**（需要命中升级窗口）。据 The Hacker News 转述，WordPress 自己的评级为「低」，两者口径不同。
4. **受影响版本**：4.7.0 至 7.1.3 的各分支（CVE 记录逐分支列出上界，如 7.0.x ≤ 7.0.7、6.9.x ≤ 6.9.10、6.8.x ≤ 6.8.11）。
5. **修复版本**：**7.1.4**；回移分支修复版为 4.7.39、4.8.34、4.9.35、5.0.31、5.1.28、5.2.30、5.3.27、5.4.25、5.5.24、5.6.23、5.7.21、5.8.19、5.9.20、6.0.18、6.1.16、6.2.15、6.3.14、6.4.14、6.5.14、6.6.11、6.7.11、6.8.12、6.9.11、7.0.8（Wordfence 漏洞库列表）。WordPress 强调只有最新版本受到主动支持。
6. **不在修复范围**：4.6 及更早版本不再获得安全更新；研究者称该问题可追溯到很早的版本，这些站点只能迁移到受支持版本。
7. **同批修复**：7.1.4 还修复了多项存储型 XSS（多处在 Interactivity API、区块与 Customizer）、一项存储型拒绝服务、未发布 Customizer 变更集信息泄露、备注（Notes）权限问题，并因 eMudhra 吊销更新了内置根证书。
8. **致谢**：升级流程问题由 Umut Bayram（Picus Security）报告。

## 事实：公开时间线

![CVE-2026-119977 公开时间线：10-28 发布与当天探测，10-31 CVE 记录，11-03 KEV，11-06 研究者补充](/uploads/wordpress-core-upgrade-window-rce/cve-2026-119977-timeline.svg)

| 日期（UTC 口径） | 事件 | 来源 |
| --- | --- | --- |
| 2026-10-28 | WordPress 7.1.4 安全版发布，修复回移到 4.7 起各分支（回移版陆续发布） | WordPress.org |
| 2026-10-28 | Wordfence 称攻击者在披露当天就开始针对该漏洞；部署防火墙规则后约 9 分钟即出现尝试 | Wordfence / THN |
| 2026-10-31 | CVE-2026-119977 记录发布（CNA：Wordfence），CVSS 8.1 | CVE 记录 |
| 2026-11-03 | CISA 列入 KEV，联邦机构修复期限 2026-11-06，并要求按 BOD 26-04 做失陷排查；CCCS 发布 AV26-1117 | CISA / CCCS |
| 2026-11-06 | 研究者补充：从受影响版本升级到修复版的那一次仍可能暴露；公开 GitHub 仓库出现自称利用代码，有效性未确认 | The Hacker News |

在野情况的公开口径：

- CISA 依据「在野利用证据」列入 KEV，但**未披露攻击细节**。
- Wordfence 称其防火墙已拦截**超过 24 万次**针对该漏洞的尝试；BleepingComputer 转述其更新称**过去 24 小时拦截 13,095 次**。两组数字统计时点不同，不应相加。
- Wordfence 观察到个别高频来源对小批站点持续轮询约 14.5 小时，与「蹲守升级时刻」的行为一致（THN 转述）。
- Wordfence 实验室中窗口只有**数秒**；实际成功率取决于站点升级耗时与 Web 服务器配置。

## 事实：修复改了什么、留下了什么

根据公开说明（WordPress 公告、CVE 记录引用的升级器代码位置、THN 对研究者的转述）：

- **修复后**：临时目录改为随机命名；且临时副本中的配置文件**不会再被复制覆盖**到正式站点。
- **「最后一次」窗口**：解包这一步由**站点上已安装的旧升级器**执行。研究者称 5.9 及以上站点的旧升级器按下载文件命名临时目录，因此升级到修复版的那一次目录名仍可预测；4.4–5.8 的旧代码会附加随机字符，除非站点通过其他途径（如报错信息）泄露目录名。
- **完整包 vs 增量包**：完整包一定包含安装程序；增量包只含两个版本之间的变化文件，是否暴露取决于包内容。站点核心文件校验和不一致或执行「重新安装」时，会回退到完整包。研究者原话的要点是：决定因素「不是完整包还是增量包，而是站点上已安装的升级器是否已修复」。
- **WP-CLI 不是替代方案**：`wp core update` 走同一升级器、解包到同一目录。

## 方法：防守清单

以下为配置与运维层面的防守动作，均来自公开建议；不涉及利用方法。

**升级前（先封目录）**

1. 在 Web 服务器配置层禁止对 `wp-content/upgrade/` 的 Web 访问。研究者给出的公开示例：Nginx 使用 `location ^~ /wp-content/upgrade/ { deny all; }`；Apache 在虚拟主机配置中对该目录使用 `Require all denied`；只能改 `.htaccess` 时，在 WordPress 根目录 `.htaccess` 的重写规则之前加入 `RedirectMatch 403 ^/wp-content/upgrade/`。
2. **不要**把 `.htaccess` 放进 `wp-content/upgrade/` 本身——旧升级器在解包前会清空该目录。
3. 确认对 `/wp-content/upgrade/` 的请求返回 **403**。WordPress 在磁盘上直接操作该目录，封禁 Web 访问不影响升级。
4. 有 WAF / CDN 的站点，同步加一条对该路径的拒绝规则作为纵深防御，但不要以它替代源站配置。

**升级**

5. 升级到 **7.1.4** 或本分支的修复版；开启了自动后台更新的站点，确认更新确实完成（版本号、更新日志）。
6. 另一条安全路线：在**Web 根之外**手工升级——备份文件与数据库，在 Web 不可达的目录解包新版本，复制核心文件（不动 `wp-config.php` 和 `wp-content`），再执行数据库升级。这样临时安装程序从不出现在 Web 可达位置。
7. 4.6 及更早版本没有修复，只能规划迁移。

**升级后（按「可能已被触达」排查）**

8. 检查 Web 访问日志中对 `wp-content/upgrade/` 下 PHP 文件的请求，尤其是历次核心升级时间点附近。
9. 检查是否有无人认领的管理员账户、未知插件，以及 `wp-content/upgrade/` 下无人放置的 PHP 文件。
10. 若发现可疑迹象：按失陷处理——隔离、从可信备份恢复、轮换数据库口令、WordPress 盐值与密钥、管理员密码与应用密码，以及服务器上可被 Web 进程读取的其他凭据。
11. 托管商 / 多站点运维：把「升级前封 `wp-content/upgrade/`」做成基线配置，而不是一次性应急动作。

## 推断：这类问题的共性

以下是基于公开事实的分析，不是厂商结论：

- **「中间状态」也是对外接口。** 升级、备份、导入、缓存生成等流程会在 Web 根下留下短暂存在的文件；只要名字可预测、服务器愿意执行，它们就和正式入口一样需要访问控制。
- **修复的生效时点比修复内容更重要。** 自更新软件的补丁要靠「旧代码」来安装，第一次升级天然处在旧逻辑下。厂商公告如果只写「请尽快升级」，运维侧需要自己补上「升级前的临时缓解」。
- **CVSS 的 AC:H 不等于没人打。** 窗口只有几秒，但自动化扫描可以长时间轮询、蹲守批量站点的升级时刻；KEV 收录和 24 万次尝试说明攻击者愿意为此付出成本。

## 边界与未确认项

- CISA 未公布具体攻击案例；目前公开的是 Wordfence 的拦截统计，不等于成功入侵数量。
- 公开 GitHub 仓库中的「利用代码」有效性未经确认，本文不引用、不链接。
- 「升级到修复版那一次仍可能暴露」来自研究者说明与媒体转述，WordPress 官方公告未单独展开；增量包是否暴露取决于具体包内容。
- 统计数字随时间变化，本文以成稿日（2026-11-08）可见的公开材料为准。

## 参考

- [WordPress.org：WordPress 7.1.4（2026-10-28 安全版公告）](https://wordpress.org/news/2026/10/wordpress-7-1-4/)
- [WordPress HelpHub：Version 7.1.4](https://wordpress.org/documentation/wordpress-version/version-7-1-4/)
- [CVE 记录：CVE-2026-119977](https://www.cve.org/CVERecord?id=CVE-2026-119977)
- [Wordfence 漏洞库：WordPress Core 4.7.0 – 7.1.3 升级窗口 RCE](https://www.wordfence.com/threat-intel/vulnerabilities/id/4b4da0cf-d9f4-47c4-a0e8-6c4dc5a6f250)
- [Wordfence：Attackers Actively Probing for Upgrade-Window RCE Vulnerability in WordPress Core](https://www.wordfence.com/blog/2026/11/attackers-actively-probing-for-upgrade-window-rce-vulnerability-in-wordpress-core/)
- [CISA：CISA Adds One Known Exploited Vulnerability to Catalog（2026-11-03）](https://www.cisa.gov/news-events/alerts/2026/11/03/cisa-adds-one-known-exploited-vulnerability-catalog)
- [CISA Known Exploited Vulnerabilities Catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog)
- [Canadian Centre for Cyber Security：WordPress security advisory (AV26-1117)](https://www.cyber.gc.ca/en/alerts-advisories/wordpress-security-advisory-av26-1117)
- [NHS England Digital：WordPress Releases Security Update Addressing Multiple Vulnerabilities (CC-4884)](https://digital.nhs.uk/cyber-alerts/2026/cc-4884)
- [The Hacker News：Installing the Fix for an Exploited WordPress Flaw Can Expose Some Sites One Last Time（2026-11-06）](https://thehackernews.com/2026/11/installing-fix-for-exploited-wordpress.html)
- [BleepingComputer：CISA flags WordPress RCE flaw as actively exploited in attacks](https://www.bleepingcomputer.com/news/security/cisa-flags-wordpress-rce-flaw-as-actively-exploited-in-attacks/)
