---
title: "Burp AES Bridge"
description: "一个 Burp 扩展，让授权测试中的应用专用请求/响应加密流程可以直接检查。"
status: active
stack: [Java, Montoya API, Burp Suite]
order: 1
---

这个桥接扩展让加解密转换过程明确、可重复，使分析人员能够专注于应用行为。配置保存在本地，默认不记录敏感材料，转换后的消息仍可追溯到原始交互。
