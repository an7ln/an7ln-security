---
title: "币安热钱包被盗复盘：公开分析指向签名基础设施被滥用，而非私钥泄露"
description: "2026-10-29（UTC）币安热钱包被抽走约 53–59 亿美元，史上最大。公开链上分析初步指向签名路径与 EIP-7702 委托授权被滥用；稳定币与 L2 冻结已锁住数十亿，BTC/ETH 无发行人可冻。币安尚未确认根因。"
published: 2026-10-30
category: web
tags: [Binance, Hot Wallet, EIP-7702, Signing Infrastructure, Stablecoin Freeze, Incident Review, Crypto]
severity: critical
vendor: Binance
product: Binance.com hot wallets
disclosure:
  status: published
  vendorConfirmed: false
featured: false
draft: false
---

## 执行摘要

结论先说：**截至发稿，主流公开分析认为这次是币安热钱包的签名路径被滥用，而不是私钥本身被盗走。** 链上可见热钱包签出了 EIP-7702 委托授权，执行权随后落到攻击者合约手里，资产被批量抽走。**币安尚未确认具体手法。**

第二个结论：**稳定币发行方和 L2 安全委员会的中心化冻结权，明显缩小了攻击者的可变现空间**，Tether、Circle、Arbitrum 等合计冻结数十亿美元；但 BTC、ETH 没有发行人可以冻结，攻击者也正在把可冻结资产换成难冻结资产。

第三个结论：**对普通用户，最大的次生风险是「赔付 / 补偿」钓鱼。** 币安称承担全部损失，用户不需要填任何表单、连接任何钱包来「领取补偿」。

本文只整理公开报道与链上分析中的事实、推断与防守建议；不提供攻击步骤、授权构造细节或攻击者地址。

![签名路径被滥用 vs 私钥泄露（概念对照，去敏）](/uploads/binance-signing-infra-drain/signing-misuse-vs-key-leak.svg)

## 事实：截至发稿的公开记录

时间以 UTC 和北京时间（UTC+8）标注。所有数字均为各方公开口径，彼此存在差异。

### 时间线

- **2026-10-29 美东下午 / UTC 当晚**：多名链上研究者发现币安关联钱包异常外流（[Cointelegraph](https://cointelegraph.com/news/binance-linked-wallet-faces-possible-exploit-blockchain-researcher-warns)）。Blockaid 称 Binance 14 热钱包约在 **20:24 UTC**（北京 10-30 04:24）被抽干。
- **北京 10-30 凌晨起**：币安暂停充提；联席 CEO 何一表示由币安承担全部损失、用户资金安全；CZ 称看起来像黑客攻击（[CoinDesk](https://www.coindesk.com/business/2026/10/29/potential-multi-billion-binance-hack-hitting-crypto-markets)、[BBC](https://www.bbc.com/news/articles/cwg7xp8kx4v5o)）。
- **Binance.US 不受影响**（[CNA](https://www.channelnewsasia.com/world/cryptocurrency-binance-hack-funds-losses-6505586)）。
- **10-30 上午**：币安核实冻结金额从 25.4 亿美元更新到约 30 亿美元，称仍可能增加（[CNBC](https://www.cnbc.com/2026/10/30/billions-in-crypto-frozen-in-binance-hack-heres-what-happens-next-.html)）。

### 损失规模（多方口径）

| 来源 | 口径 | 金额（美元） |
|---|---|---|
| Chainalysis | 盗窃发生时估值 | 约 59.12 亿 |
| Arkham | 标记钱包簇持仓 | 约 58.4 亿 |
| Glassnode | 估算 | 约 53 亿 |

资产构成（CoinDesk / Arkham 口径）：约 15 亿 BTC、约 9 亿 ETH、约 14 亿 USDT/USDC，其余为其他代币。按任一口径，都是有记录以来最大的加密资产盗窃，约为 2025-02 Bybit（约 15 亿美元）的四倍。

### 冻结参与方

| 参与方 | 冻结内容 | 规模 |
|---|---|---|
| 币安（汇总口径） | 已核实冻结 | 约 30 亿美元（早先 25.4 亿） |
| Tether | USDT | 约 15.7 亿 |
| Circle | USDC | 超过 8 亿 |
| Arbitrum Security Council | 约 7460 万 ARB + 8425 ETH | 约 3050 万 |
| Ripple | 相关 RLUSD | 未见统一数字 |
| World Liberty Financial | 约 2700 万 USD1 + 约 200 万 WLFI | — |

**冻结不等于已归还**，后续需要法律与发行方流程。

### 资金动向（公开）

- 攻击者经 Uniswap 等 DEX 换币；
- 在 Aave 以被盗 USDT 作抵押，借出约 1.976 万–2 万 WETH（约 4400–4460 万美元）；Aave 随后冻结相关市场作预防。

### 机制方面的公开说法

- Blockaid CEO Ido Ben-Natan 初步判断为**签名基础设施被滥用（key misuse），而非私钥被盗**（[Cointelegraph](https://cointelegraph.com/news/binance-hack-may-involve-private-key-misuse-not-theft-blockaid-ceo)）。
- 链上可见针对 Binance 14 的 EIP-7702 委托授权批次，公开报道称单笔交易打包了 50 条授权。
- Arkham CEO 称信息仍不足，攻击可能仍在进行。
- ZachXBT、Blockaid 等称链上准备手法与 Bybit 等事件相似，**可能**与朝鲜关联团伙有关。这是研究者说法，不是官方归因。

## 推断：签名路径滥用和私钥泄露差在哪

以下是基于公开信息的分析，不是币安结论。

**私钥泄露**意味着密钥被复制到系统外，攻击者可以在自己的环境里随意签名；修复只能换钥、迁移全部资产。**签名路径滥用**则是密钥仍在签名系统（HSM / MPC / 托管服务）内，攻击者让系统签出了它本不该签的请求。断点在审批策略、请求来源校验、交易内容解析，而不在密钥存储。

EIP-7702 让 EOA 可以把执行逻辑委托给一个合约。公开机制结论是：热钱包一旦签出指向攻击者合约的委托授权，后续执行权就交给了对方，资产可以被批量转走。签名策略如果只看「是不是普通转账、金额多少」，而没有把「委托授权」当成高危操作单独审批，就会出现这种盲区。

这和 Bybit 2025 的公开取证叙事属于同一类问题：Bybit 案中，签名人在被篡改的界面上批准了看似正常的交易，私钥本身没有外泄。两起事件都说明，**大额资产的风险正在从「密钥被偷」转向「签名人或签名系统被骗着签」**。

**换币和借贷的动机**很直接：USDT、USDC 有发行人可以冻结，攻击者需要尽快把它们换成 ETH 等没有发行人的资产。在 Aave 用 USDT 抵押借 WETH，等于在冻结落地前把可冻结资产「借」成难冻结资产。

## 冻结机制的边界

![被盗资产流向与冻结分层（去敏）](/uploads/binance-signing-infra-drain/funds-freeze-layers.svg)

- **稳定币发行方**（Tether、Circle、Ripple、WLFI）：合约内置黑名单 / 冻结权，响应快，是本次冻结金额的大头。
- **L2 安全委员会**（Arbitrum）：拥有紧急升级权限，可以冻结链上资产。这次被用来止损，但也再次证明这类 L2 存在中心化控制点。
- **借贷协议**（Aave）：可以冻结市场，阻止继续借出，但不能没收已借出的资产。
- **BTC、ETH 主网资产**：没有发行人，不能冻结。只能靠追踪和下游交易所配合拦截。

所以「已冻结 30 亿」里，可冻结类资产占比高；BTC、ETH 部分的追回空间要小得多。

## 与 Bybit（2025-02）对比

| 维度 | Bybit 2025-02 | 币安 2026-10 |
|---|---|---|
| 规模 | 约 15 亿美元 | 约 53–59 亿美元 |
| 资产结构 | 以 ETH 及衍生品为主 | BTC、ETH、稳定币混合 |
| 冻结 | 占比较小 | 截至发稿约 30 亿（各方口径） |
| 签名路径叙事 | 多签界面被篡改，签名人被骗签 | 公开初步判断为签名基础设施滥用 + EIP-7702 委托授权 |
| 归因 | FBI 公开归因朝鲜 | 研究者称可能相似，尚无官方归因 |
| 平台兜底 | 承担损失 | 承担损失 |

## 建议：普通用户怎么防

- **不存在需要你操作的「补偿」**。任何要你填表、连钱包、签名、输入助记词来「领取赔付」的，一律是钓鱼。
- 警惕假客服私信、假空投、假「安全迁移」通知。
- 只认官方渠道：币安官网、官方 App 和官方 X 账号。不要点搜索广告和私信里的链接，仔细核对域名。
- 充提恢复后，先看官方公告再操作，不要因为恐慌把资产转到陌生地址。

对机构的建议：把委托授权、合约升级、批量授权一类操作列为独立高危审批；签名系统要解析交易语义，而不是只校验格式和金额。

## 边界与未确认项

- 币安尚未公布根因，「签名基础设施滥用」仍是第三方初步判断。
- 损失与冻结数字来自不同时间点和口径，后续可能修正。
- 朝鲜归因仅为研究者说法。
- 攻击可能仍在进行，本文不更新实时数字。

## 参考链接

- [CoinDesk：Potential multi-billion Binance hack hitting crypto markets](https://www.coindesk.com/business/2026/10/29/potential-multi-billion-binance-hack-hitting-crypto-markets)
- [BBC](https://www.bbc.com/news/articles/cwg7xp8kx4v5o)
- [CNA：Binance hack funds losses](https://www.channelnewsasia.com/world/cryptocurrency-binance-hack-funds-losses-6505586)
- [Cointelegraph：Binance-linked wallet faces possible exploit](https://cointelegraph.com/news/binance-linked-wallet-faces-possible-exploit-blockchain-researcher-warns)
- [Cointelegraph：Binance hack may involve private key misuse, not theft — Blockaid CEO](https://cointelegraph.com/news/binance-hack-may-involve-private-key-misuse-not-theft-blockaid-ceo)
- [CNBC：Billions in crypto frozen in Binance hack](https://www.cnbc.com/2026/10/30/billions-in-crypto-frozen-in-binance-hack-heres-what-happens-next-.html)
