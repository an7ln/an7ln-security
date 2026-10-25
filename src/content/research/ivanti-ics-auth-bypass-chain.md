---
title: "Ivanti Connect Secure 认证旁路链（CVE-2026-104935）：VPN 网关零日、内存态利用与补丁边界"
description: "Ivanti Connect Secure 认证旁路 + 代码执行（CVE-2026-104935，CVSS 8.6）被 UTA0576 作为零日链利用并已列入 CISA KEV；须升级到 25.1.1.2 / 25.1.3.x / 22.8R2.5，并对 10-03 起暴露的设备做网络与内存取证、轮换设备可触达的目录凭据。"
published: 2026-10-25
category: web
tags: [Ivanti, Connect Secure, CVE-2026-104935, CVE-2026-111357, Authentication Bypass, VPN, KEV, UTA0576]
severity: high
cwe: CWE-290
cve: CVE-2026-104935
vendor: Ivanti
product: Connect Secure
disclosure:
  status: fixed
  vendorConfirmed: true
featured: false
draft: false
---

## 执行摘要

结论先说：**这是 VPN 网关的「先升级、再按假定失陷取证」事件，而不是「打完补丁就结束」。** Ivanti 于 2026-10-13 公开 Connect Secure（ICS）安全公告与 [CVE-2026-104935](https://www.cve.org/CVERecord?id=CVE-2026-104935)：根因类为 **认证旁路（Authentication Bypass by Spoofing，CWE-290）**，与同一链上的代码执行缺陷合并追踪，未认证远程攻击者可在设备上执行任意命令；CVSS 3.1 **8.6（High）**。CISA 同日列入 Known Exploited Vulnerabilities（KEV）。

Volexity 公开分析显示：未知行为体 **UTA0576** 自 **2026-10-03** 起把它与一个**单独的本地提权缺陷**串成零日链，对当时「已打满补丁」的 22.8R2.4 设备取得 root 级执行，随后集中窃取 Active Directory 相关凭据与机密（LAPS 密码、BitLocker 恢复信息等）。该链**不落 webshell / 后门、主要在内存中运行并删改日志**，Ivanti 完整性检查工具（ICT）因此**可能看不到**——CISA 明确要求以网络与内存取证判断是否失陷。

修复边界：CVE-2026-104935 已在 **25.1.1.2、25.1.3.0 / 25.1.3.1、22.8R2.5** 修复；22.7R2.14 及更早版本不受影响。链上的提权步骤已获独立编号 **CVE-2026-111357**，截至本文成稿（2026-10-25）**未查到公开修复版本**——因此本文对该步骤**不做任何技术展开**。修复 CVE-2026-104935 即切断已公开的未认证入口。

本文只整理厂商、CISA、各国 CERT 与 Volexity 公开材料中的失败模式、修复边界与防守清单；**不提供**请求构造、端点 / 头部 / 文件路径、载荷、竞态时序或任何可复现步骤。

![Ivanti Connect Secure 零日链信任边界：未认证入口 → 认证旁路与代码执行（CVE-2026-104935，已修复）→ 本地提权（CVE-2026-111357，未展开）→ 后渗透与防守切点](/uploads/ivanti-ics-auth-bypass-chain/ics-chain-boundary.svg)

## 背景：SSL VPN 网关是身份系统的延伸

Ivanti Connect Secure（原 Pulse Connect Secure）是企业 SSL VPN / 远程接入网关：对外暴露登录门户，对内通常持有**目录服务（LDAP / AD）服务账户**用于认证与授权查询，并可能保存证书、API 密钥与许可证服务器凭据。

因此网关一旦被未授权控制，影响往往不限于「一台边缘设备」：

- 设备保存或经手的目录凭据可被直接用来查询 AD 中的高价值属性；
- 设备处在明文协议流量的必经路径上，抓包即可能拿到认证材料；
- 边缘设备的日志与完整性工具本身就可能被篡改或绕开。

这也是 CISA 与 Ivanti 恢复流程把「重置所有账户密码、吊销重签证书、重置 API 密钥与许可证服务器凭据」列为标准动作的原因。

## 事实：漏洞类、评分与版本范围

以下来自 Ivanti 公告（经 CISA、CERT Santé、CyberSecurity Malaysia、Censys 等转述一致）与 CVE / NVD 记录：

1. **漏洞类**：认证旁路（CWE-290），与代码执行缺陷在同一 CVE 下追踪；网络可达、低复杂度、无需权限、无需用户交互。
2. **评分**：CVSS 3.1 Base **8.6（High）**。
3. **受影响版本**：ICS **25.1.1.1 及更早**、**25.1.2.2 及更早**、**22.8R2.4 及更早**；**22.7R2.14 及更早不受影响**。
4. **修复版本**：
   - 25.1.1.x 分支 → **25.1.1.2**（2026-10-05 发布）；
   - 25.1.2.x 分支 → **25.1.3.0**（2026-07 发布）或 **25.1.3.1**；
   - 22.8 分支 → **22.8R2.5**（2026-10-12 发布）；Ivanti 建议 22.8 用户**优先迁到 25.1.1.2 或更高**，22.8R2.5 仅作无法立即迁移时的过渡。
5. **Workaround**：公告未给出有效 workaround（截至 2026-10-14 的公开转述）。
6. **生命周期**：ICS **22.8 分支于 2027-01-31 EOL**。
7. **利用状态**：Ivanti 确认对「有限数量客户」的在野利用；CISA 2026-10-13 列入 KEV。截至 Censys 2026-10-14 的公开通告，未见公开 PoC。

## 事实：公开时间线

![CVE-2026-104935 / CVE-2026-111357 公开时间线](/uploads/ivanti-ics-auth-bypass-chain/ics-timeline.svg)

| 日期（2026） | 公开事实 |
| --- | --- |
| 10-03 | Volexity 观察到 UTA0576 开始反复利用该链，目标设备为当时最新的 22.8R2.4（Volexity）。 |
| 10-05 | Volexity 在网络安全监测客户处启动调查，定位 ICS 设备为根因；25.1.1.2 发布（Volexity / Censys）。 |
| 10-10 | Volexity 向其情报客户提供相关指标（Volexity）。 |
| 10-12 | 22.8R2.5 发布（Censys / CERT Santé）。 |
| 10-13 | Ivanti 公告与 CVE-2026-104935 公开；CISA 列入 KEV 并发警报；Volexity 发布分析（Ivanti / CISA / Volexity）。 |
| 10-15 | 提权步骤获独立编号 CVE-2026-111357（GitHub Advisory Database，经公开 CVE 聚合站转述）。 |
| 10-16 ~ 10-21 | 加拿大 CCCS（AV26-1035 Update 1 提及 CVE-2026-111357 在野利用）、新加坡 CSA（AL-2026-147）、马来西亚 CSM 相继发布通告。 |

日期采用各公开来源给出的日历日；换算到 Asia/Shanghai 不改变上述公历日的先后关系，细节以原文为准。

## 事实：链的结构（仅失败模式类别）

Volexity 将这次利用拆为三个缺陷；下面只写**类别**，不写触发条件与具体位置：

1. **认证旁路（CVE-2026-104935 的一部分，已修复）**：前端在做「是否需要认证」的判断时，与后端决定「请求实际交给哪个处理程序」时，**依据的不是同一个输入**。结果是一个本应公开的入口可被用来触达本应受保护的处理程序。
2. **代码执行（CVE-2026-104935 的一部分，已修复）**：某个受保护的上传处理逻辑**先落盘、后校验**，在校验失败并删除之前存在短暂窗口；配合第 1 步，攻击者可在 Web 服务账户权限下执行代码。
3. **本地提权（CVE-2026-111357，未查到公开修复）**：从 Web 服务账户提升到 root。**本文不描述其机制。**

Volexity 同时记录：每条命令都会**重新走一遍整条链**，结果经同一 HTTPS 通道返回；**没有部署 webshell 或后门**；对库代码的修改只发生在进程内存中、事后恢复，因此**以文件变化为依据的 ICT 检测不到**。

## 事实：后渗透行为（公开层）

Volexity 报告的行为类别如下（工具名、文件路径与指标以原文和其 GitHub 指标库为准，本文不转载）：

- **设备内凭据与配置**：读取设备保存的 LDAP 域凭据、认证方式配置等；
- **AD 查询**：以设备的 AD 服务账户经 LDAP 查询 **LAPS 本地管理员密码、BitLocker 恢复信息**、含密码语义的属性与登录脚本路径；导出有限的 AD 元数据；
- **流量抓包**：以改名的抓包程序在设备上捕获常见明文协议流量（LDAP、HTTP 等），并解析其中的明文 LDAP / HTTP Basic 凭据与 NTLM 挑战-响应；
- **凭据验证与扩展**：自研 Kerberos 工具（具备 Kerberoast 能力）、针对 AD 账户的密码喷洒；内网 DNS 与主机侦察；解析设备认证日志提取有效用户名；
- **反取证**：选择性删除调试日志与 Linux 审计日志中的近期条目；自删临时脚本与结果文件；恢复被临时修改的配置与内存补丁。

归因方面：Volexity 以**低置信度**评估 UTA0576 更偏**犯罪而非间谍**动机；并以**中置信度**评估其在漏洞利用开发与后渗透中使用了大语言模型（依据是持续复用利用通道下发命令、高度定制且硬编码凭据的脚本、链本身的复杂度）。这两条均是研究方的评估，不是事实认定。

## 推断：为什么这类事件「打补丁」不够

以下为**推断**，不是厂商对具体客户的结论：

1. **无持久化 ≠ 无损失。** 该链不留 webshell，升级后入口被切断，但**已被拿走的东西不会因升级而失效**：AD 服务账户口令、LAPS 密码、BitLocker 恢复信息、抓包中的认证材料都需要按「已泄露」处理和轮换。
2. **ICT 干净不能作为结论。** 公开材料已说明利用发生在内存中、并主动删改日志；只看设备内文件与日志会系统性低估风险，**设备外**的反向代理 / WAF / 防火墙 / NSM 记录才是关键证据。
3. **「已打满补丁」也会中招，暴露窗口按日历算。** 受害设备在被打时运行的是当时最新版本；所以盘点应按「**2026-10-03 起**在受影响版本上对外可达的时间段」来做，而不是按「现在是否已升级」。
4. **认证判定与路由分离是可复用的失败模式。** 网关 / 反向代理 / 应用多层架构中，只要「做鉴权的那层」和「决定把请求交给谁的那层」各看各的输入，就存在同类旁路风险——这是架构审计时值得专门检查的边界（检查思路，不是针对任何具体产品的结论）。
5. **服务账户权限是放大器。** 设备 AD 服务账户若能读取 LAPS / BitLocker 等敏感属性，网关失陷就直接变成域内高价值机密泄露；这类账户应按最小权限重新审视。

## 建议：可核验清单

综合 Ivanti、CISA、各国 CERT 与 Volexity 的公开建议（操作级，不含利用步骤）：

1. **盘点**：列出所有 ICS 设备（物理 / 虚拟 / 云）的当前版本，以及 **2026-10-03 以来**曾运行过的版本与对外可达情况；22.7R2.14 及更早不受本 CVE 影响，但同样需确认 EOL 与其他公告状态。
2. **升级**：25.1.1.x → **25.1.1.2+**；25.1.2.x → **25.1.3.0 / 25.1.3.1+**；22.8 → 优先迁到 **25.1.1.2+**，不能立即迁移则先上 **22.8R2.5**。硬件与虚拟设备的迁移注意事项见 Ivanti 25.x 升级与迁移兼容性指南。对外暴露的设备优先。
3. **持续跟踪 CVE-2026-111357**：订阅 Ivanti 公告，修复发布后立即安排；在此之前，修补 CVE-2026-104935 是切断已公开未认证入口的关键。
4. **取证（暴露窗口内的设备）**：按 CISA 要求做**网络与内存取证**；调取设备外的反向代理 / 负载均衡 / WAF / 防火墙日志回溯到至少 10-03，按 Volexity 原文给出的检测思路排查异常请求模式；关注设备发起的异常 LDAP 查询、密码喷洒迹象与来自设备的横向移动尝试。**不要以 ICT 结果作为排除依据。**
5. **怀疑失陷时（Ivanti 恢复流程 / CISA）**：先备份设备配置 → 出厂重置并升级（云 / 虚拟实例直接重建并升级）→ 恢复配置 → **重置所有账户密码（域、管理员、本地）**、吊销并重签设备保存的证书、重置 API 密钥与许可证服务器凭据。取证前如需隔离，优先在边界阻断并为虚拟设备做内存与磁盘快照。
6. **域侧轮换**：轮换设备使用的 AD 服务账户；对其可读取范围内的 **LAPS 密码**强制轮换、评估 **BitLocker 恢复密钥**是否需要重新生成；关注相关服务账户的 Kerberos 票据与 SPN 暴露面。
7. **收敛权限与协议**：复核设备 AD 服务账户的读权限，去掉对 LAPS / BitLocker 等属性的不必要访问；推动 LDAP 等明文协议迁到 LDAPS / 签名与通道绑定，降低「网关抓包即得凭据」的收益。
8. **KEV 排期**：联邦 / 强合规环境按 CISA KEV 与 BOD 26-04 要求处理；其他组织也应把「在野利用 + 对外暴露的认证网关」视作最高优先级变更。

## 局限

- 本文未对任何生产 ICS 设备做测试，不报告可识别目标的结果；未独立复现利用。
- 不提供 PoC、请求体、端点 / 头部 / 文件路径、竞态细节或载荷；Volexity 原文中的检测细节请直接查阅原文。
- CVE-2026-111357（提权）截至成稿未查到公开修复版本，本文仅提及其存在与编号；该判断基于公开检索，读者应以 Ivanti 官方公告为准。
- Ivanti 公告页需脚本渲染，本文的版本与日期信息同时对照了 CISA、CERT Santé、CyberSecurity Malaysia、Censys 的转述；如有出入，以 Ivanti 原文为准。
- 归因与「使用大语言模型」均为 Volexity 的置信度评估，不是事实认定。

## 参考

- Ivanti, [Security Advisory Ivanti Connect Secure (CVE-2026-104935)](https://hub.ivanti.com/s/article/Security-Advisory-Ivanti-Connect-Secure-CVE-2026-104935?language=en_US), 2026-10-13
- CISA, [CISA Urges Patching Newly Exploited Vulnerability in Ivanti Connect Secure](https://www.cisa.gov/news-events/alerts/2026/10/13/cisa-urges-patching-newly-exploited-vulnerability-ivanti-connect-secure), 2026-10-13
- CISA, [CISA Adds Two Known Exploited Vulnerabilities to Catalog](https://www.cisa.gov/news-events/alerts/2026/10/13/cisa-adds-two-known-exploited-vulnerabilities-catalog), 2026-10-13
- Volexity, [A Series of Unauthenticated Events: Chained Exploitation of Ivanti Connect Secure Zero-Days](https://www.volexity.com/blog/2026/10/13/a-series-of-unauthenticated-events-chained-exploitation-of-ivanti-connect-secure-zero-days/), 2026-10-13
- Censys, [Ivanti Connect Secure Authentication Bypass (CVE-2026-104935)](https://censys.com/advisory/cve-2026-104935/), 2026-10-15
- Canadian Centre for Cyber Security, [Ivanti security advisory (AV26-1035) – Update 1](https://www.cyber.gc.ca/en/alerts-advisories/ivanti-security-advisory-av26-1035), 2026-10-13（更新于 2026-10-16）
- Cyber Security Agency of Singapore, [Active Exploitation of Vulnerability in Ivanti Connect Secure (AL-2026-147)](https://www.csa.gov.sg/alerts-and-advisories/alerts/al-2026-147/), 2026-10-20
- CERT Santé, [Ivanti – CVE-2026-104935](https://cyberveille.esante.gouv.fr/alertes/ivanti-cve-2026-104935-2026-10-14), 2026-10-14
- CVE Record, [CVE-2026-104935](https://www.cve.org/CVERecord?id=CVE-2026-104935)；NVD, [CVE-2026-104935](https://nvd.nist.gov/vuln/detail/CVE-2026-104935)
- CVE Record, [CVE-2026-111357](https://www.cve.org/CVERecord?id=CVE-2026-111357)
