---
title: "自主安全智能体中的提示边界失效"
description: "针对同时处理不可信目标内容、工具、凭据与长期任务记忆的智能体威胁模型。"
published: 2026-07-18
category: ai-security
tags: [Agents, Prompt Injection, Tool Security]
severity: research
featured: false
disclosure:
  status: research
  vendorConfirmed: false
---

自主安全智能体会同时跨越多条边界：目标可控内容进入模型上下文，模型可以调用工具，工具可能持有凭据，结果还可能持续影响后续任务。

## 把数据与权限分开

HTML、Issue 文本、仓库文件和命令输出都是证据，而不是指令。工具权限必须来自操作者与任务策略，绝不能来自正在检查的内容。

## 约束有后果的操作

使用限定范围的凭据、明确的目标白名单、只读默认值和受限命令族。任何发布、删除、购买、发送消息或扩大目标范围的操作，都应经过人工批准。

## 保留完整审计轨迹

记录影响决策的源文件、授权工具调用的策略、精确目标和执行结果。真正可用的智能体不仅要有能力，还必须让每一次行动都可重建、可质疑。
