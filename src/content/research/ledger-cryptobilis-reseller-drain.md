---
title: "Ledger 经销商渠道失窃复盘：密钥在交付链上泄露，不是设备被远程攻破"
description: "2026-10-09 东南亚 Ledger 经销商 CryptoBilis 买家钱包被集中清空，链上统计约 9,290 万美元、311 个钱包。Ledger 称自身系统未被入侵，原因仍在调查；链上特征指向单一行为体事先持有全部助记词。"
published: 2026-10-10
category: web
tags: [Ledger, CryptoBilis, Supply Chain, Hardware Wallet, Incident Review, Crypto]
severity: critical
vendor: Ledger
product: Ledger hardware wallets (reseller channel)
disclosure:
  status: published
  vendorConfirmed: false
featured: false
draft: false
---

## 执行摘要

结论先说：**这起事件的断点在「设备到用户手里之前或初始化那一刻」，不是 Ledger 设备被远程攻破，也不像普通钓鱼签名。** 2026-10-09（北京时间），通过东南亚授权经销商 CryptoBilis 购买 Ledger 的用户钱包在一小时内被集中清空。Ledger 官方确认正在调查、已要求该经销商暂停全部销售与发货，并称自身基础设施、系统与服务未被入侵；**Ledger 尚未确认损失金额，也未确认原因**。

链上分析给出的画像很清楚：Bitquery 统计 311 个钱包、五条链、约 9,290 万美元；几十个钱包在几秒内签出同一授权，30 个 TRON 钱包在三秒内被加上同一个控制 key。这只有「一个行为体手里已有全部私钥」才解释得通。密钥具体从哪一环漏出（被改装的设备、预置助记词卡、App 或其他），截至发稿**仍未公开确认**。

本文只整理公开声明与链上分析中的事实、推断与防守建议；不提供改装方法、攻击者地址细节或任何可复用的技术步骤。

![Ledger / CryptoBilis 事件公开时间线与信任链（去敏）](/uploads/ledger-cryptobilis-reseller-drain/timeline-raster.svg)

## 事件确认：为什么是这一起

用户要求「复盘 Ledger 攻击事件」。Ledger 历史上有多起被广泛讨论的事件：2020 年电商数据库泄露（客户邮箱与住址外泄，引发长期钓鱼）、2023-12 Connect Kit 前端库供应链投毒。本文选 **2026-10-09 CryptoBilis 经销商渠道失窃**，理由：

- 时间最近（发稿前一天），X 上讨论量最大，官方、经销商、链上研究者都有公开材料；
- 影响规模远超前两起中的直接资金损失；
- 2020 年泄露案在 2026-09 被提起集体诉讼，属于法律进展，不是新的攻击。

## 事实：公开声明与链上记录

以下时间均为北京时间（UTC+8）。

### 官方与当事方公开声明

- **Ledger Support（2026-10-09 21:32）**[公开声明](https://x.com/Ledger_Support/status/2108551100613714002)：正在调查东南亚用户通过经销商 CryptoBilis 购买产品后的资金损失报告；已要求其暂停所有 Ledger 设备的销售与发货；建议近 90 天内从该经销商购买、尚未初始化的用户不要开始设置；已设置的用户考虑把资产转到使用**新助记词**的新 Ledger 设备。
- **Ledger 对媒体**：事件看起来局限于该经销商及其市场，未收到直接从官方购买设备的报告；「Ledger 的基础设施、系统和服务未被入侵」（据 [Cointelegraph](https://cointelegraph.com/news/ledger-investigates-fund-losses-linked-to-southeast-asian-reseller-warns-users)）。
- **CryptoBilis**：10-09 晚间在 X 先后发布 [Official Notice](https://x.com/cryptobilis/status/2108641764605354103) 与 [Update](https://x.com/cryptobilis/status/2108671666490626200)（内容为图片）。本文未对其全文做独立核对，不转述具体说法。
- **CZ（赵长鹏）**[公开声明](https://x.com/cz_binance/status/2108558560560918852)：据目前信息，似乎是局限于单一供应商的供应链攻击，少数人可能买到了假冒或被篡改的 Ledger。这是个人判断，不是调查结论。

CryptoBilis 据 [The Block](https://www.theblock.co/news/business/2026-10-09-ledger-cryptobilis-fund-losses-418163) 列为 Ledger 在印尼、马来西亚、菲律宾的官方经销商。

### 链上记录（Bitquery，数据截至 10-10 15:00）

[Bitquery 调查](https://bitquery.io/investigations/ledger-cryptobilis-hack)从链上研究者 tanuki42、Specter 公开的地址出发追踪，主要结论：

| 项目 | 数值 / 现象 |
| --- | --- |
| 受影响钱包 | 311 个，覆盖 TRON、Bitcoin、Ethereum、BNB Chain、Polygon |
| 损失 | 约 9,290 万美元（早期公开估算 7,200 万→8,600 万，只覆盖部分地址） |
| 准备期 | 09-25 攻击者控制地址首次获得资金；09-26 至 10-07 在 TRON、Ethereum 各约 20 次小额测试循环 |
| 主攻窗口 | 10-09 约 13:00 起 30 个 TRON 钱包在 3 秒内被加上同一控制 key；13:07 起 25 个 TRON 钱包在两个区块内签同一授权；13:54 一个比特币区块内清空 111 个钱包 |
| 冻结 | Tether 冻结约 1,000 万美元 USDT |
| 洗钱 | 部分 USDT 换成不可冻结的稳定币或经跨链 / 兑换服务换成 ETH；部分 ETH 经 Tornado Cash 与 Zcash 转出 |
| 钱包「年龄」 | 约六成受害钱包首次入账在 Ledger 所说的 90 天窗口内，八成以上在 6 月之后 |

## 推断：密钥在哪一环漏出

**以下为分析推断，不是官方结论。**

1. **攻击者事先持有私钥，而不是靠用户逐个签名。** TRON 多签权限变更只能由钱包自己的 key 发起；30 个钱包在 3 秒内完成同一变更，加上 111 个比特币钱包在同一区块按同一费率清空，这是一套已掌握全部密钥的程序在批量执行。Bitquery 也评估过「钓鱼站点囤积签名后集中广播」的可能，并以一笔在主攻期间才签出的整额转账为反证，认为可能性低。
2. **断点集中在经销商渠道。** 受害者共同点是买入渠道，官方直购用户无报告；Ledger 处置动作也是叫停经销商、要求换新助记词，而非推送固件更新。这与「设备本身存在可远程利用的漏洞」不符。
3. **具体机制仍开放。** 可能包括：设备在交付前被改装、随附预置助记词卡、引导用户使用假冒 App 等。独立研究者 Mark Karpelès 在 X 上[公开展示](https://x.com/MagicalTux/status/2108651005617607082)其拆解的「带蜂窝模块、读屏外传助记词」的改装 Ledger，但他本人[说明](https://x.com/MagicalTux/status/2108717370340696531)这台**并非**从授权经销商购入，而是来自电商平台上的低价货。这说明此类改装在现实中存在，但**不能直接证明本次就是同一手法**。
4. **影响时间可能早于 90 天。** 6 月首次入账的受害钱包占比明显，说明官方建议的 90 天窗口可能偏窄。

## 失败模式：为什么「买授权渠道」也没挡住

- **「授权经销商」只是商业关系，不是安全边界。** 用户把对 Ledger 的信任延伸给了经销商，但经销商的库存、仓储、包装环节不在用户可验证范围内。
- **设备真伪检查只覆盖它被设计覆盖的部分。** 正版安全芯片在场时，官方的真伪校验仍可通过；它不负责发现外壳内多出来的部件，也无法知道助记词是否在别处被看到或预先生成。
- **助记词是唯一的根。** 硬件钱包保护的是「签名时私钥不出设备」；一旦助记词在生成或抄写时外泄，攻击者无需接触设备就能在任意链上恢复钱包。
- **攻击者有耐心。** 两周测试、等受害者把资金存满后再统一清空，说明从被植入到被收割之间有足够的时间差，用户在这段时间里看不到异常。

## 建议

### 个人用户

- 近几个月（不只 90 天）从 CryptoBilis 购买过 Ledger：未初始化的不要设置；已使用的，换一台**来源可信**的新设备，生成**新助记词**后迁移资产。只是给旧设备「重置」不够，如果设备本身有问题，重置后的新助记词同样会泄露。
- 任何随设备附带的「已写好助记词」的卡片、要求你输入已有助记词的「激活流程」，一律视为攻击。
- TRON 上持有 USDT 的，用区块浏览器检查账户权限，出现不认识的 key 即意味着控制权已丢失。
- 警惕事后的「资金追回」「官方客服私信」类二次诈骗。Ledger 官方号已多次在 X 上[提醒](https://x.com/Ledger/status/2108676483933708391)，Ledger 不会私信索要助记词。

### 厂商与经销商

- 对授权经销商做供应链抽检（拆机比对、包装防拆证据、批次溯源），并公开抽检结果与渠道名单。
- 在初始化流程里更明确地提示「助记词必须由设备当场生成，任何预置都是攻击」，并考虑对异常硬件（额外射频模块等）做可检测的完整性校验。
- 出事后尽快给出可验证的排查方法（例如拆机照片比对指南），以及受影响批次 / 时间段，而不是只给 90 天这种粗粒度窗口。

### 交易所与稳定币发行方

- 对公开的攻击者地址尽快做入金筛查与冻结；本次 Tether 在地址公开后约十分钟开始冻结，但仍有大部分资金在此之前或通过不可冻结资产转出。

## 未决问题

- 密钥泄露的确切环节与手法，以及涉事设备的实际数量；
- CryptoBilis 的库存来源，以及是否存在内部人员参与；
- Ledger 后续调查结论与赔付安排。

后续有官方结论时本文会更新。

## 参考来源

- Ledger Support 声明（X，2026-10-09）：<https://x.com/Ledger_Support/status/2108551100613714002>
- CryptoBilis 公告（X，2026-10-09）：<https://x.com/cryptobilis/status/2108641764605354103>、<https://x.com/cryptobilis/status/2108671666490626200>
- CZ 公开声明（X）：<https://x.com/cz_binance/status/2108558560560918852>
- Mark Karpelès 公开帖（X）：<https://x.com/MagicalTux/status/2108651005617607082>、<https://x.com/MagicalTux/status/2108717370340696531>
- Bitquery，《The Ledger CryptoBilis hack took $92.9M from 311 wallets》：<https://bitquery.io/investigations/ledger-cryptobilis-hack>
- CoinDesk：<https://www.coindesk.com/business/2026/10/09/ledger-investigates-potential-wallet-tampering-after-reports-of-usd86-million-in-crypto-stolen>
- Cointelegraph：<https://cointelegraph.com/news/ledger-investigates-fund-losses-linked-to-southeast-asian-reseller-warns-users>
- The Block：<https://www.theblock.co/news/business/2026-10-09-ledger-cryptobilis-fund-losses-418163>
