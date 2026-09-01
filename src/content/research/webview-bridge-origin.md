---
title: "WebView 桥接在缺少源校验时会把原生能力交给任意页面"
description: "一套用于盘点 Android/iOS WebView 桥接是否对调用方起源做允许清单校验的通用方法。"
published: 2026-09-01
category: mobile
tags: [WebView, Android, iOS, Origin]
severity: research
cwe: CWE-749
featured: false
draft: true
disclosure:
  status: research
  vendorConfirmed: false
---

问题不在“页面能不能跑 JavaScript”，而在“这段脚本是不是被允许调用原生接口”。Android 的遗留桥接 `addJavascriptInterface` 没有基于起源（origin）的访问控制，对象会被注入到 WebView 里的每一个 frame，包括 iframe。iOS 的 `WKScriptMessageHandler` 也不会在平台层替你做允许清单。结论是：只要 WebView 能加载不受信任的文档，或信任域上存在跨站脚本（XSS），缺少源校验的桥就会把应用权限交给调用方。本文只讨论 Android、Apple 与 OWASP 已经公开的检查方法，不涉及可识别的未公开目标。

## 背景与范围

适用范围：在应用内 WebView 中暴露原生能力的 Android 与 iOS 客户端。不适用于系统浏览器，也不把 `WebView.getUrl()` 一类当前页面字段当成安全边界。

事实来自平台文档。Android 明确建议用 `addWebMessageListener` 配合 `allowedOriginRules`，并把 `addJavascriptInterface` 标为低安全性、不推荐。[1] 该接口对所有 frame 可见，且因为 WebView 的异步行为，无法安全判断是哪个 frame 在调用；不能用 `WebView.getUrl()` 做校验。[1][2] Apple 侧需要自己检查 `WKScriptMessage.frameInfo` 的 `securityOrigin`，没有与 `addWebMessageListener` 对等的内置允许清单。[3]

与现场笔记[《Android 初步分析中的实用 Frida 模式》](/notes/frida-android-triage/)的分工：笔记回答运行时怎么看见桥，本文回答看见之后如何判断起源校验是否成立。

## 技术分析

先画加载链，再盘桥，再问每一座桥“谁可以调用、调用后做什么”。

加载链至少覆盖：写死的 `https://`、深度链接改写的 URL、服务端重定向、`file://`、以及把用户 HTML 塞进 WebView 的路径。OWASP 测试 MASTG-TEST-0334 把失败条件写成三件事同时成立：`setJavaScriptEnabled(true)`、至少一次 `addJavascriptInterface`、暴露的方法能接触敏感数据或敏感操作且可被不受信任内容触达。[4]

Android 盘点清单：

| 观察点 | 通过条件 | 失败信号 |
| --- | --- | --- |
| 桥接 API | `WebViewCompat.addWebMessageListener` 且 `allowedOriginRules` 非 `*` | 仅有 `addJavascriptInterface` |
| 调用方 | 平台层按起源允许清单暴露对象 | 任意 frame（含 iframe）可见同一对象 |
| 伪校验 | 不把 `WebView.getUrl()` 当调用方身份 | 用当前 URL 字符串决定是否执行原生操作 |
| 卸载 | 加载不受信任内容前 `removeJavascriptInterface` | 同一 WebView 先注入桥再导航到外部页 |

iOS 盘点清单：

| 观察点 | 通过条件 | 失败信号 |
| --- | --- | --- |
| 回程 | `WKScriptMessageHandlerWithReply`，把结果还给调用方的 Promise | `evaluateJavaScript` 写入页面全局回调 |
| 起源 | 处理前检查 `frameInfo.securityOrigin` | 任意 `postMessage` 都执行原生逻辑 |
| 内容世界 | `WKContentWorld` 隔离注入脚本 | 把隔离当成授权（它不是） |

推断（不是厂商确认）：多数“登录页 WebView”会同时打开 JavaScript、注入会话或支付相关方法、并允许一次跳转。这三项叠在一起时，起源校验缺失就从配置问题变成可利用条件。本文不把该推断写成已验证披露。

即使允许清单正确，信任域上的 XSS 仍能以被允许的起源发言。Android 文档写明 origin 规则挡不住站点自身的脚本注入。[1] 这是方法边界，不是额外漏洞编号。

## 影响与限制

影响面是应用进程权限，不是浏览器沙箱里的页面权限。桥方法一旦可读 Token、可调本地文件、可发起已登录请求，调用方就继承了这些能力。CWE 侧对应暴露危险方法（CWE-749）；OWASP 弱点条目为 MASWE-0033。[5]

限制：静态搜索注解 `@JavascriptInterface` 会漏混淆后的注册点；运行时枚举更完整，但仍取决于你是否覆盖了所有 WebView 实例。本文不提供可复用的攻击脚本。没有 CVE，也没有厂商确认。

## 修复或缓解

建议与文档一致，按优先级排列：

1. Android 改用 `addWebMessageListener`，把 `allowedOriginRules` 写成具体起源，避免单独使用 `*`。[1][6]
2. 加载不受信任内容之前移除遗留接口。[2]
3. iOS 在 handler 里校验 `securityOrigin`，回程改用 `WKScriptMessageHandlerWithReply`，不要把敏感值打进页面全局函数。[3][7]
4. 对消息体做类型与字段校验。起源允许清单不能替代输入校验。
5. `WKContentWorld` 或 Android 的 `JavaScriptExecutionWorld` 只隔离注入脚本，不能代替起源授权。[5]

维护者发布前仍需确认：正文只有通用方法，没有未公开目标证据。

## 参考资料

1. [Access native APIs with JavaScript bridge](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge)，Android Developers。
2. [WebView – Native bridges](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)，Android Developers。
3. [MASTG-BEST-0058: Restrict Native Functionality Exposed Through WebView Bridges](https://mas.owasp.org/MASTG/best-practices/MASTG-BEST-0058/)，OWASP。
4. [MASTG-TEST-0334: Native Code Exposed Through WebViews](https://mas.owasp.org/MASTG/tests/android/MASVS-PLATFORM/MASTG-TEST-0334/)，OWASP。
5. [MASWE-0033: Sensitive Native Functionality Exposed in WebViews](https://mas.owasp.org/MASWE/MASVS-PLATFORM/MASWE-0033/)，OWASP。
6. [MASTG-BEST-0035: Prefer Origin Scoped Messaging Over Legacy JavaScript Bridges](https://mas.owasp.org/MASTG/best-practices/MASTG-BEST-0035/)，OWASP。
7. [MASTG-BEST-0062: Use WKScriptMessageHandlerWithReply to Return Data to JavaScript](https://mas.owasp.org/MASTG/best-practices/MASTG-BEST-0062/)，OWASP。
8. [WKUserContentController](https://developer.apple.com/documentation/webkit/wkusercontentcontroller)，Apple Developer Documentation。
9. [userContentController(_:didReceive:replyHandler:)](https://developer.apple.com/documentation/webkit/wkscriptmessagehandlerwithreply/usercontentcontroller(_:didreceive:replyhandler:))，Apple Developer Documentation。
10. [Build web apps in WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview)，Android Developers。
