---
title: "BeyondTrust Remote Support 源校验缺失（CVE-2026-102764）：远程支持设备上的零日与补丁窗口"
description: "BeyondTrust Remote Support 内部消息组件源校验不足（CVE-2026-102764 / BT26-05，CVSSv4 9.3）曾被用作零日；CISA 已列入 KEV。自托管须立即打 BT26-05-RS，SaaS 已于 2026-10-09 完成修补。"
published: 2026-10-18
category: api
tags: [BeyondTrust, Remote Support, CVE-2026-102764, BT26-05, Origin Validation, KEV, ARMORY CASTLE]
severity: critical
cwe: CWE-290
cve: CVE-2026-102764
vendor: BeyondTrust
product: Remote Support
disclosure:
  status: fixed
  vendorConfirmed: true
featured: false
draft: false
---

## 执行摘要

结论先说：**这是远程支持（Remote Support）设备面的紧急补丁与假定失陷事件，不是「可延后的配置微调」。** BeyondTrust 于 2026-10-15 公开安全公告 [BT26-05](https://www.beyondtrust.com/trust-center/security-advisories/bt26-05) 与 CVE-2026-102764：根因是 **Remote Support 内部消息组件对消息来源（origin）校验不足**（CWE-290），在合适条件下可被远程攻击者用于在受影响设备上执行文件操作；CVSSv4 Base **9.3**。CISA 同日将条目表述为关键认证绕过**，并在 2026-10-16 列入 Known Exploited Vulnerabilities（KEV），敦促立即修补。

公开时间线表明：该洞在 2026-08-29 起曾被用作零日，针对 **一台** BeyondTrust 托管（SaaS）实例与 **一台** 自托管设备；厂商于 10-08 发布补丁，**SaaS 已于 10-09 全量打补丁**，自托管须手动确认。Mandiant / Google Threat Intelligence Group（GTIG）将零日利用与后续驻留归因于疑似中国背景的间谍活动集群 **ARMORY CASTLE**（原 UNC5221；CrowdStrike 跟踪为 Warp Panda）。

本文只整理厂商公告、CISA 警报与 Mandiant/GTIG 公开分析中的失败模式、修复边界与防守清单；**不提供**请求构造、载荷、端点细节、可复现攻击步骤或未公开的利用细节。BeyondTrust 在披露时明确暂缓公开技术细节，以免尚未打补丁的自托管设备扩大风险——本文遵循同一边界。

![CVE-2026-102764 信任边界：未认证调用方经源校验不足的内部消息组件进入 Remote Support 设备面](/uploads/beyondtrust-rs-origin-validation/rs-trust-boundary.svg)

## 背景：远程支持设备是凭据与会话的中介面

BeyondTrust Remote Support（原 Bomgar）是企业远程支持 / 远程访问类设备：IT 人员经其发起对终端的支持会话、文件传输与管理操作，设备本身常存储或中介特权凭据，并维护 Jump Item、会话策略与对外可达的客户门户。

因此，**设备主机面一旦被未授权控制，爆炸半径通常不止「多了一台被控主机」**：

- 设备上中介或保管的凭据应视为暴露；
- Jump Item / 团队权限变更可把访问扩到下游端点；
- 本地日志可能被擦除，仅依赖设备内证据不足以证明未失陷。

CISA 与 Mandiant 的公开处置建议都围绕「打补丁 → 收敛暴露 → 日志外送 → 怀疑时重建并轮换凭据」展开，而不是「只改一项配置」。

## 事实：根因类、评分与产品范围

以下均来自 BeyondTrust BT26-05 与 CISA 警报原文要点（事实层）：

1. **根因类（厂商）**：内部组件 **未充分校验所接收消息的来源（origin）**；在合适条件下可用于在设备上执行文件操作。Synopsis：**Improper Origin Validation in an Internal Messaging Component**；CWE-**290**。
2. **评分（厂商）**：CVSSv4 Base **9.3**；向量 `CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`；Severity **Critical**。公告 Issue Date：**2026-10-15**。
3. **CISA 表述**：critical **authentication bypass** vulnerability CVE-2026-102764；威胁行为者积极利用以获得初始访问，随后建立持久化、提权并横向移动；2026-10-16 列入 KEV。
4. **受影响产品 / 版本（厂商）**：Remote Support **全部版本 ≤ 26.2.3**。
5. **修复（厂商）**：补丁标识 **BT26-05-RS**，适用于 **v24.3.1–v26.2.3**；版本 **低于 24.3.1** 须先升级到较新版本再打补丁。
6. **SaaS**：截至 **2026-10-09**，修复补丁已应用到全部 Remote Support SaaS 客户；托管部署客户对设备本身无需再操作（凭据与配置审查仍适用，见下文）。
7. **Privileged Remote Access（PRA）**：厂商写明内部测试**未**识别出可在 PRA 上利用该弱点的路径，但因共享受影响代码，仍为 PRA 发布补丁并建议自托管 PRA 立即应用（谨慎原则，不是已确认的同洞利用）。
8. **技术细节**：BeyondTrust 披露时 **暂缓公开**漏洞技术细节，优先保护尚未打补丁的自托管客户。

Mandiant 公开描述成功利用的后果类为：**任意文件上传**，并可通向主机级控制与对设备所存储 / 中介凭据的访问。本文不展开上传路径、请求形态或文件落点。

## 事实：公开时间线与利用现状

以下日期采用厂商博客与 CISA 警报给出的日历日；换算到 Asia/Shanghai 时仍落在同一公历日（披露日为美东时间更新，以公开日界为准）。

| 日期（2026） | 公开事实 |
| --- | --- |
| 08-29 | 行为体以零日利用 **一台** BeyondTrust 托管 Remote Support 实例与 **一台** 自托管设备（BeyondTrust 博客）。 |
| 09-27 | 另一厂商边缘设备的零日战役公开；Mandiant 向 BeyondTrust 发出简短提醒；厂商威胁情报管道启动狩猎（BeyondTrust 博客）。 |
| 09-28 | 厂商狩猎发现受影响 SaaS 实例，**自首次检出起 27 分钟内遏制**；当晚复现进入向量并开始修复（BeyondTrust 博客）。 |
| 09-30 | Mandiant 分享自托管客户调查结果，与厂商 09-28 发现一致；修复在测试构建上通过验证（BeyondTrust 博客）。 |
| 10-08 | 向 SaaS 与自托管客户发布 BT26-05 补丁；SaaS 的 Remote Support 与 Privileged Remote Access 实例自动打补丁（BeyondTrust 博客）。 |
| 10-09 | 公告写明：修复补丁已应用到全部 Remote Support SaaS 客户（BT26-05）。 |
| 10-15 | 协调披露：CVE、公开公告、厂商博客与 Mandiant 分析同日发布（BeyondTrust / Mandiant）。 |
| 10-16 | CISA 将 CVE-2026-102764 列入 KEV，并发布敦促修补 Remote Support 的警报。 |

厂商博客在 10-16 更新时写明：截至当时**仅知上述两家客户受影响**，且自 8 月事件后未见新的对抗活动证据。Mandiant / GTIG 同时提醒：该行为体历史上常在零日公开后转向**广谱、机会式利用**仍未打补丁的实例——因此披露后窗口对自托管暴露面尤其关键。

![BT26-05 / CVE-2026-102764 公开时间线与影响范围摘要](/uploads/beyondtrust-rs-origin-validation/rs-timeline.svg)

### 二级确认（以厂商与 CISA 日期为基准）

- **CISA**：[敦促修补 BeyondTrust Remote Support](https://www.cisa.gov/news-events/alerts/2026/10/16/cisa-urges-patching-critical-vulnerability-beyondtrust-remote-support)（2026-10-16）；同日 [KEV 双条目警报](https://www.cisa.gov/news-events/alerts/2026/10/16/cisa-adds-two-known-exploited-vulnerabilities-catalog) 亦收录相关条目。
- **Mandiant / GTIG**：[ARMORY CASTLE Exploits BeyondTrust](https://cloud.google.com/blog/topics/threat-intelligence/armory-castle-exploits-beyondtrust/)（2026-10-15）：确认晚于 8 月的零日利用证据，描述后渗透失败模式与防守选项，并提供狩猎用指标（哈希、YARA 等见原文，本文不转载可复现细节）。
- **SecurityWeek 等媒体**：复述厂商时间线与 ARMORY CASTLE 归因；战役细节以 Mandiant / BeyondTrust 原文为准。

## 事实：后渗透失败模式（仅公开层，无复现步骤）

Mandiant 公开分析描述的是**失陷后行为画像**，不是利用手册。摘要如下（细节、命令、路径与规则以 Mandiant 原文为准，本文不复制）：

1. **立足点**：成功利用后部署定制 webshell（公开命名 **SAWFLY**），经设备既有 Web 服务交互操作。
2. **提权与持久化**：从站点服务账户提升至主机 root 级控制；使用能在重启 / 配置重置后存活的持久化手法（厂商与 Mandiant 均强调：仅「清理」不可审计的设备主机文件系统通常不够）。
3. **凭据**：尝试从设备原生密钥 / Vault 管理能力中读取中介凭据；随后凭管理员凭据进入 Remote Support 应用面。
4. **横向**：修改 Jump Item / 团队权限，滥用内建支持会话与文件传输触及下游端点。
5. **隧道**：部署定制 SOCKS5 / WebSocket 隧道组件（公开命名 **BARECLAW**），并调整设备反向代理配置以暴露自定义路径（具体改动见 Mandiant，本文不复述配置片段）。
6. **反取证**：系统化删除系统、Web 与应用日志——因此 **必须依赖设备外的 syslog / WAF / 边界防火墙日志** 做交叉核验。

BeyondTrust 对受影响 SaaS 实例的调查写明行为与 Mandiant 描述一致，并强调：自动化告警分流曾将高严重信号误判为误报关闭；后续狩猎程序（而非仅依赖分流结论）才发现该事件。

## 推断：为什么远程支持设备失陷代价不同

下列为**推断**，不是厂商对某一具体客户的定论：

1. **中介面失陷 ≈ 凭据与会话拓扑一并暴露。** Remote Support 的产品定位就是「替人连上去」；主机级控制成立后，Vault / 注入凭据、会话历史与 Jump 清单都处于风险之下，直到重建并轮换。
2. **「只打补丁、不查外送日志」不足以证明未失陷。** 公开材料已写明本地日志可被擦；暴露窗口内曾对不可信网络可达的自托管设备，应按 CISA / Mandiant 建议做假定失陷审查。
3. **披露后窗口对自托管更关键。** 厂商称披露前仅见选择性零日；Mandiant 提醒该行为体有「公开后广谱扫未修补实例」的历史——自托管且未订阅自动更新的设备是优先盘点对象。
4. **PRA 补丁是共享代码上的谨慎措施。** 厂商未声称 PRA 已遭同洞利用；自托管 PRA 仍应按公告应用补丁，但不把「PRA 已确认被利用」写成事实。

## 建议：可核验清单

综合 BT26-05、厂商博客、CISA 与 Mandiant 公开建议（操作级，不含利用步骤）：

1. **盘点部署形态**：区分 BeyondTrust 托管（SaaS）与自托管；列出全部 Remote Support（及自托管 PRA）版本号。SaaS 设备面补丁已由厂商在 10-09 完成；仍须按需做凭据与配置审查。
2. **打补丁**：自托管 **≥ 24.3.1 且 ≤ 26.2.3** → 在 `/appliance` 应用 **BT26-05-RS**（或确认自动更新已生效）。**< 24.3.1** → 先升级到受支持版本再打补丁。补丁不可见时，向 BeyondTrust Support 开单并引用 BT26-05。
3. **收敛暴露**：对外只开放用户 / 客户支持所需服务；**管理接口（如 `/login`、`/appliance`）限制到受信网络**；限制设备出站，仅允许更新、许可与自有 syslog / 目录服务等必要目标。
4. **日志外送**：将近实时 syslog 与会话事件转到 SIEM（TLS）；同步保留反向代理 / WAF 与边界防火墙日志。本地日志单独不可信。
5. **狩猎行为（非单点 IoC）**：无法解释的特权 / 管理会话（尤其来自住宅宽带或商业 VPN 出口）；Web 目录出现不明脚本、Web 服务账户拉起 shell；Jump Item / 团队权限被提升为 Administrator；单会话窗口内出现的日志转发缺口。文件哈希与 YARA 见 [Mandiant 原文](https://cloud.google.com/blog/topics/threat-intelligence/armory-castle-exploits-beyondtrust/)。
6. **假定失陷时的处置**：隔离前先做虚拟机快照 / 取证镜像；在边界阻断入站而非先改设备内配置；**从已知干净镜像重建**并打上 BT26-05；轮换设备存储或注入过的全部凭据；撤销活跃支持会话；审查特权账户上的新 MFA 登记；对照暴露窗口前基线审查用户、角色、API 账户与 Jump 配置。
7. **KEV 流程对齐**：联邦 / 强合规环境按 CISA KEV 与适用 BOD 排期；非联邦组织仍应将「已确认活跃利用 + Critical + 远程支持中介面」当作最高优先级变更。

## 局限

- 本文未获授权对任何生产 Remote Support / PRA 做测试；不报告可识别目标的结果。
- 未独立复现利用；不提供 PoC、请求体、完整路径、载荷或攻击步骤。
- BeyondTrust 暂缓公开漏洞技术细节；二级媒体若补充未链回厂商 / Mandiant / CISA 的战役细节，本文不采信。
- 厂商称截至博客更新仅知两家客户受影响——这是披露时点的公开状态，不排除后续通报变化；读者应以厂商 Trust Center 与 Support 渠道为准。

## 参考

- BeyondTrust, [Security Advisory BT26-05](https://www.beyondtrust.com/trust-center/security-advisories/bt26-05), Issue Date 2026-10-15
- BeyondTrust Security Team, [ARMORY CASTLE and BT26-05: What Security Teams Need to Know](https://www.beyondtrust.com/blog/entry/bt26-05), 2026-10-15（Last Updated 2026-10-16）
- CISA, [CISA Urges Patching Critical Vulnerability in BeyondTrust Remote Support](https://www.cisa.gov/news-events/alerts/2026/10/16/cisa-urges-patching-critical-vulnerability-beyondtrust-remote-support), 2026-10-16
- CISA, [CISA Adds Two Known Exploited Vulnerabilities to Catalog](https://www.cisa.gov/news-events/alerts/2026/10/16/cisa-adds-two-known-exploited-vulnerabilities-catalog), 2026-10-16
- Mandiant / GTIG, [ARMORY CASTLE Exploits BeyondTrust](https://cloud.google.com/blog/topics/threat-intelligence/armory-castle-exploits-beyondtrust/), 2026-10-15
- CVE Record, [CVE-2026-102764](https://www.cve.org/CVERecord?id=CVE-2026-102764)
- NVD, [CVE-2026-102764](https://nvd.nist.gov/vuln/detail/CVE-2026-102764)
