---
title: "HTTP/3 竞态：单数据报与 QPACK 阻塞流为何能压过单包攻击"
description: "HTTP/3 不消灭 TOCTOU。公开材料显示，单数据报与 QPACK 阻塞流可比 HTTP/2 单包攻击把请求捆得更紧；降级路径上的 Transfer-Encoding 注入仍是协议回退边界问题。"
published: 2026-09-24
category: web
tags: [HTTP/3, QUIC, Race Condition, TOCTOU, QPACK, Request Smuggling]
severity: research
disclosure:
  status: research
  vendorConfirmed: false
featured: false
draft: false
---

## 执行摘要

HTTP/3 把传输从 TCP/TLS 换成 QUIC/UDP，并不会自动消掉「检查时刻」与「使用时刻」之间的空窗（TOCTOU）。PortSwigger 在 2026-09-23 公开的 [HTTP/3 in Burp Suite](https://portswigger.net/research/http3-in-burp-suite) 写得很直：若目标支持 HTTP/3，**单数据报攻击**（Single Datagram Attack）与 **QPACK 阻塞流**（QPACK Blocked Streams）给出的请求分组，可以比已广为人知的 HTTP/2 **单包攻击**（Single-Packet Attack）更紧，从而对准更窄的竞态窗。

本文整理的是公开结论与失败模式，不是工具评测，也不是可复用利用手册。事实层以 PortSwigger 原文及其点名的两项研究标题为准；推断层只谈架构含义；建议层只写可核验的边界检查。

![HTTP/3 竞态分组对比示意：单包、单数据报与 QPACK 阻塞流](/uploads/http3-race-windows/h3-race-grouping.webp)

## 背景：竞态窗在缩，根因没换

Web 竞态常见根因仍是状态机里的 TOCTOU：多个请求几乎同时读到「还可以做一次」的状态，再几乎同时写入，最终越过业务上限。PortSwigger 较早的 [Smashing the state machine](https://portswigger.net/research/smashing-the-state-machine) 与 [单包攻击](https://portswigger.net/research/the-single-packet-attack-making-remote-race-conditions-local) 说明过：远程测试难，往往难在网络抖动把本该同窗的请求打散；把多请求末字节塞进同一 TCP 包，可以把远端竞态「拉近」到接近本地。

HTTP/3 换了承载层，没有改掉「检查与使用不同步」这一类逻辑缺陷。原文点名的两份研究标题把结论写进了名字本身：

- *QUIC-er Races: HTTP/3 won’t save you from TOCTOU vulnerabilities*（单数据报）
- *Chaos by Design: The Death of Stochastic Race Conditions in HTTP/3*（QPACK 阻塞流 / 服务端侧编排）

截至本文写作，公开入口以 [HTTP/3 in Burp Suite](https://portswigger.net/research/http3-in-burp-suite) 为准；上述标题按该文引用列出，不另 invent URL。

## 事实：HTTP/3 上两类更紧的分组

### 1. 单数据报攻击

在 QUIC 上，多个已就绪的 HTTP/3 请求可以落在**同一个 UDP 数据报**里一起完成。相对「多请求末字节同 TCP 包」的单包攻击，原文明确说：目标支持 HTTP/3 时，这类分组**可以更好**，从而打到更小的竞态窗。

失败模式（比操作步骤更重要）：

- 目标根本不谈 HTTP/3：技术不可用，不是「防御成功」。
- 数据报体积与路径 MTU 限制批量规模：分组变紧不等于无限放大并发数。
- 中间设备或负载均衡对 UDP/QUIC 的处理差异，会使「同报到达」假设失效，表现为偶发打不进窗，而不是业务逻辑已修好。

### 2. QPACK 阻塞流

第二类手法把同步点挪到**服务端**：利用 QPACK 头压缩/解压阻塞，让多条流在服务端排队，再在可编排的时机一起放行。原文称其为 Server-Side Race Orchestration，并写明 Turbo Intruder 在服务器支持时才会选用 QPACK 路径；`gateMode` 可强制其一，默认 `auto`。

失败模式：

- 服务端 QPACK 行为不符合预期时，自动选择会退回单数据报或更弱分组，实验复现率会掉。
- 「服务端侧同步」依赖实现细节；换版本、换反向代理、关动态表，都可能让阻塞窗消失。
- 把它误读成「HTTP/3 自带随机竞态消除」是反的：原文叙事是随机性下降、可编排性上升，对防守方更糟，不是更安全。

## 事实：降级路径上的 Transfer-Encoding 边界

同一篇文章还覆盖 HTTP/3 **降级**场景：当请求从 HTTP/3 回落到 HTTP/1 风格处理时，可在 kettled 语法里尝试注入 `Transfer-Encoding: chunked` 一类头。公开示例的意图是说明：**协议回退边界**上，前端以为自己在说 HTTP/3，后端却可能按 HTTP/1 语义解析新注入的长度编码头。

这不是「必须 HTTP/3 才能走私」的新魔法，而是经典请求走私/降级问题在新协商路径上的延续。失败与误判模式：

- 没有真实降级，只有端到端 HTTP/3：注入头不会变成 HTTP/1 语义。
- 网关规范化或丢弃非法头：表面「测不通」，根因可能是规范化，不是业务已免疫。
- 只在实验室自建栈上看到异常，却把结论外推到全部 CDN/反代组合：证据不足。

工具侧，原文用 escape 表（如 `^~` 表示 CRLF、`^s` 表示空格）描述 kettled 请求；本文不展开可复现载荷序列，只保留「降级后头注入是边界检查点」这一结论。

## 推断：测面扩大，不等于「新漏洞类」

从公开材料可合理推断三件事，且都应标成推断而非已证实全网扫描结果：

1. **只测 HTTP/1.1/2 的竞态用例，会系统性漏掉 HTTP/3 独有同步面。** Adapter 把原先不可达的 HTTP/3-only 源纳入代理工具链，扩大的是可达面，不是自动证明新 CVE。
2. **性能数字（例如 Wi-Fi 上约 10 万 RPS、同区云上约 18 万 RPS）说明的是测试吞吐，不是漏洞严重度。** 高 RPS 降低「没打够次数」的假阴性，不提高单个 TOCTOU 的 CVSS。
3. **AUTO 引擎动态择高版本并调参，对长时间 fuzz 有利；对 desync 类测试，原文反而不推荐 AUTO，而指向禁用连接复用的 HTTP/1.1 `BURP` 引擎。** 引擎选择错误会造成「以为测了 HTTP/3 竞态，实际在测别的东西」。

## 建议：防守与验证清单

下列建议可独立核验，不依赖具体商业插件：

1. **业务层**：凡「限次、余额、券、幂等键、审批态」等共享状态，用事务、原子更新或服务端幂等键关掉 TOCTOU；不要假设「上了 HTTP/3 就够了」。
2. **协议层**：盘点对外是否宣告 HTTP/3（Alt-Svc / QUIC）；对降级与双协议入口做头语义一致性测试，尤其关注 `Transfer-Encoding` / `Content-Length` 冲突时的规范化策略。
3. **回归层**：对已知竞态敏感接口，在「仅 HTTP/2」「强制 HTTP/3」「混合降级」三种路径各留一条回归；分组技术变紧后，旧的「偶发复现」可能变成「稳定复现」。
4. **观测层**：对短窗内重复写同一资源打结构化日志（请求 ID、协议版本、后端处理起始时间差）；没有时间差数据，就无法区分「网络没捆紧」和「逻辑已修好」。

## 局限

- 本文未对第三方生产目标做授权测试；不报告任何可识别站点的结果。
- 未独立复现 PortSwigger 给出的 RPS 数字；数字仅作原文陈述。
- *QUIC-er Races* 与 *Chaos by Design* 以原文标题引用；若后续出现稳定公开 URL，应补链，而非改写结论。
- 不提供针对真实目标的利用步骤、完整脚本或可直接粘贴的走私序列。

## 参考

- Tom Stacey, PortSwigger Research, [HTTP/3 in Burp Suite - it’s time to find a bigger wordlist](https://portswigger.net/research/http3-in-burp-suite), 2026-09-23
- James Kettle, PortSwigger Research, [The single-packet attack: making remote race-conditions 'local'](https://portswigger.net/research/the-single-packet-attack-making-remote-race-conditions-local)
- James Kettle, PortSwigger Research, [Smashing the state machine: the true potential of web race conditions](https://portswigger.net/research/smashing-the-state-machine)
