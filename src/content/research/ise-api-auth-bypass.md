---
title: "Cisco ISE API 认证绕过（CVE-2026-76460）：管理面暴露与紧急补丁边界"
description: "Cisco ISE/ISE-PIC API 认证控制不足（CVE-2026-76460，CVSS 10.0）已遭活跃利用；无有效 workaround，须按公告补丁表升级并用 iACL 收敛管理面。"
published: 2026-10-04
category: api
tags: [Cisco ISE, CVE-2026-76460, Authentication Bypass, NAC, KEV]
severity: critical
cve: CVE-2026-76460
vendor: Cisco
product: Identity Services Engine
disclosure:
  status: research
  vendorConfirmed: true
featured: false
draft: false
---

## 执行摘要

结论先说：**这是管理面紧急补丁事件，不是「可延后的配置微调」。** Cisco 于 2026-09-16 公开 [cisco-sa-ISE-ABP-VNSW7Tn5](https://sec.cloudapps.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-ISE-ABP-VNSW7Tn5)：CVE-2026-76460 根因是 **ISE / ISE-PIC 某一 API 端点的认证控制不足**，未认证远程攻击者可绕过基于 Web 的管理认证；CVSS 3.1 Base **10.0**（`AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H`）。Cisco PSIRT **已知活跃利用**；**无有效 workaround**，临时缓解是用 iACL 限制到达设备的管理/控制面流量，最终须升到公告给出的首次修复补丁。

本文只整理公开公告与二级确认材料中的失败模式、修复边界与防守清单；不提供请求构造、端点路径细节、载荷或可复现攻击步骤。

![CVE-2026-76460 信任边界：未认证调用方经认证控制不足的 API 进入管理面](/uploads/ise-api-auth-bypass/ise-trust-boundary.svg)

## 背景：ISE 是准入决策点，管理面失陷代价不同

Cisco Identity Services Engine（ISE）在许多企业网络里充当网络准入控制（NAC）与 Zero Trust 架构中的策略决策点（PDP）：认证用户与设备、评估姿态、决定有线/无线/VPN 等入口是否放行。ISE Passive Identity Connector（ISE-PIC）则把身份上下文接到同一策略体系。

因此，**管理面 API 上的认证失败，不只是「多拿了一个管理会话」**：设备本身被未授权访问后，身份与策略数据的完整性都处于风险之下。对运维而言，暴露面往往是「谁能连到管理/API 口」；对本洞而言，Cisco 明确写明：**与设备配置无关**——不能指望关掉某个可选功能来消掉漏洞类。

## 事实：根因类、影响面与产品范围

以下均来自 Cisco 公告原文要点（事实层）：

1. **根因类**：某一 API 端点上 **insufficient authentication control**（认证控制不足）。攻击者通过向受影响 API 端点发送特制请求完成利用；成功后可绕过 Web 管理界面认证，获得对受影响设备的未授权访问。
2. **评分**：CVSS 3.1 Base 10.0；向量 `AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H`（网络可达、低复杂度、无需权限、无需用户交互、范围改变、机密/完整/可用性均为高）。
3. **受影响产品**：Cisco ISE 与 Cisco ISE-PIC，**regardless of device configuration**。
4. **利用现状**：Cisco PSIRT **aware of active exploitation**；强烈建议升到固定软件版本。
5. **发现来源**：在解决一起 Cisco TAC 支持案例过程中发现（Source 节）。
6. **公告族**：属于 2026-09-16 一组 Advance Notification 公告；另有同期 ISE Security Hardening Release 文档，本文聚焦 ABP 这条认证绕过公告。

成功利用后的权限边界，Cisco 在 Indicators of Compromise 节写明：威胁行为者**可能获得 root 权限的命令执行**；因此利用证据与 IoC **可能被移除或隐藏**。Cisco **强烈建议**交叉核对设备**之外**的网络日志与防火墙日志，包括但不限于从受影响设备向外部 IP 发起的异常上传，或从恶意 IP 的下载。

## 事实：修复表、缓解边界与防守侧日志审查

### 无 workaround；iACL 只是缓解

公告 Workarounds 节：**There are no workarounds that address this vulnerability.** 同时给出 mitigation：使用基础设施访问控制列表（iACL），**仅允许**到达受影响设备的、必要的管理与控制面流量。Cisco 把缓解明确标成**临时方案**，直到升级到含修复的软件。

### 首次修复版本

| Cisco ISE / ISE-PIC 发布线 | 首次含修复的版本 |
| --- | --- |
| 3.1 | 3.1 Patch 12 |
| 3.2 | 3.2 Patch 11 |
| 3.3 | 3.3 Patch 12 |
| 3.4 | 3.4 Patch 7 |
| 3.5 | 3.5 Patch 4 |

Cisco ISE **3.0** 已达软件维护结束（EoSM）：**无本洞修复包**，须迁移到含修复的受支持版本。升级指引见 Cisco ISE 支持页 Upgrade Guides；PSIRT 仅对公告内 affected / fixed 信息负责。

![CVE-2026-76460 修复版本矩阵：3.1–3.5 补丁与 3.0 须迁移](/uploads/ise-api-auth-bypass/ise-patch-matrix.svg)

### 防守侧 IoC（仅日志审查，不扩展利用面）

Cisco 给出的检测方向是审查访问日志中的**可疑用户名**；分布式部署须**每个节点**都查。公告给出的非穷尽示例命令形态为：

```text
admin#show logging application ise-kong/access.log | include dummyuser
```

其中 `dummyuser` 是 Cisco 用来说明「如何在日志里匹配可疑用户名」的**示例模式**，不是完整战役用户名清单。更多 `access.log` 可通过含 debug 的 support bundle（共享密钥加密）取得，解密后路径形如 `./ise/logs/apigateway/access.log`。

若怀疑已遭恶意活动，Cisco **强烈建议**对受影响节点 **re-image**，并在需要时从配置备份恢复——不要假设「本地清干净」在 root 级访问之后仍然成立。

### 二级确认（以 Cisco 日期为基准）

- **CISA**：2026-09-16 将 CVE-2026-76460 列入 Known Exploited Vulnerabilities（KEV）目录，并在同日警报中与另一条目一并公布；名称写作 *Incorrect Use of Privileged APIs*。[CISA 警报](https://www.cisa.gov/news-events/alerts/2026/09/16/cisa-adds-two-known-exploited-vulnerabilities-catalog) · [KEV 过滤页](https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=CVE-2026-76460)
- **Tenable**：CVE 条目复述 Cisco 描述，并标记 KEV；发布日写 2026-09-16。[Tenable CVE-2026-76460](https://www.tenable.com/cve/CVE-2026-76460)
- **Beazley Security**：2026-09-17 顾问文确认同日披露与活跃利用、无 workaround、补丁表与 iACL 缓解，并强调 ISE 在身份基础设施中的位置。[BSL-A1209](https://labs.beazley.security/advisories/BSL-A1209)

若二级材料在「公告发布时间戳 / KEV 入库批次措辞」上与 Cisco `First Published: 2026 September 16 16:00 GMT` 不完全同秒对齐，以 Cisco 公告版本史为准；二级材料只作「同日列入 KEV、产业侧确认活跃利用」的旁证。

## 推断：爆炸半径不止一台 appliance

下列为**推断**，不是 Cisco 给出的特定战役归因：

1. **管理面 root 级访问一旦成立，ISE 上的身份目录、策略与证书相关配置都应视为不可信，直到重装并核验。** 公告已写明证据可能被擦；「只打补丁、不查日志、不交叉核对外网日志」不足以证明未失陷。
2. **下游网络准入决策可能被间接操纵。** ISE 作为 PDP，设备失陷后，攻击者理论上可影响「谁能进网」——这是架构位置带来的影响面放大，不等于已有公开战役细节证明某次具体篡改。
3. **管理口对不可信网络可达时，iACL 缓解的收益最高；但「配置无关」意味着不能把「我们没开某功能」当成不受影响的证据。** 缓解降低远程触达概率，不替代补丁与取证。

## 建议：可核验清单

1. **盘点版本**：列出全部 ISE / ISE-PIC 节点（含分布式每个节点）的发布线与补丁级；3.0 直接进入迁移计划。
2. **补丁 / 迁移**：升到上表首次修复版本或更新；变更窗口前备份配置，变更后验证管理与策略平面。
3. **收敛暴露**：立即用 iACL / 管理面网络隔离，仅允许必要管理与控制面流量到达设备；确认管理/API 口不对 Internet 开放。
4. **日志审查**：在**每个节点**审查 `ise-kong/access.log`（及 support bundle 中的 apigateway access 日志）中的异常/可疑用户名；同步拉取设备外的防火墙与网络日志，查找异常外联或下载。
5. **假定失陷时的处置**：若出现可疑条目或外部日志异常，按公告建议 **re-image** 节点，并从**干净**配置备份恢复；轮换可能暴露的管理凭据与相关密钥材料。
6. **KEV 流程对齐**：联邦/强合规环境按 CISA KEV 与适用 BOD 要求排期；非联邦组织仍应将「已确认活跃利用 + CVSS 10 + 无 workaround」当作最高优先级变更。

## 局限

- 本文未获授权对任何生产 ISE 做测试；不报告可识别目标的结果。
- 未独立复现利用，不提供 PoC、请求体、完整 API 路径或攻击步骤。
- Cisco 未在本公告中公布具体攻击基础设施或战役级 IoC（除日志审查方向与 `dummyuser` 示例模式外）；二级来源若补充归因，须单独核验，本文不采信未链回 Cisco/CISA 的战役细节。
- CUHK ITSC 等校方警报页若短暂不可达，不影响以 Cisco 公告为事实基准的结论。

## 参考

- Cisco PSIRT, [Cisco Identity Services Engine Authentication Bypass Vulnerability (cisco-sa-ISE-ABP-VNSW7Tn5)](https://sec.cloudapps.cisco.com/security/center/content/CiscoSecurityAdvisory/cisco-sa-ISE-ABP-VNSW7Tn5), First Published 2026-09-16
- CISA, [CISA Adds Two Known Exploited Vulnerabilities to Catalog](https://www.cisa.gov/news-events/alerts/2026/09/16/cisa-adds-two-known-exploited-vulnerabilities-catalog), 2026-09-16
- CISA, [Known Exploited Vulnerabilities Catalog（CVE-2026-76460）](https://www.cisa.gov/known-exploited-vulnerabilities-catalog?field_cve=CVE-2026-76460)
- Tenable, [CVE-2026-76460](https://www.tenable.com/cve/CVE-2026-76460)
- Beazley Security, [Critical Vulnerability in Cisco ISE Under Active Exploitation (CVE-2026-76460) / BSL-A1209](https://labs.beazley.security/advisories/BSL-A1209), 2026-09-17
- CUHK ITSC, [Cisco ISE API Authentication Bypass Vulnerability (CVE-2026-76460) alert](https://www.itsc.cuhk.edu.hk/all-it/information-security/information-security-alerts/cisco-identity-services-engine-ise-api-authentication-bypass-vulnerability-cve-2026-76460/)（写作时抓取曾遇 502；链接保留供核验）
