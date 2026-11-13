---
title: "一个 Skill 脚本，怎么走到 Kubernetes 命名空间管理员"
description: "授权测试复盘：普通账号通过自定义 Skill 在业务 Pod 里留下持久进程，再读到挂载的 ServiceAccount，拿到命名空间内 * / * 权限。断点在身份、网络与准入边界同时缺位。"
published: 2026-11-14
topic: AI 安全
tags: [AI Agent, Kubernetes, ServiceAccount, Confused Deputy, Skill, Authorization, Incident Review]
draft: false
---

> 从「用户自定义 Skill」到「集群 apiserver」，整条链里没有一个越权接口、不需要管理员权限、不需要诱导任何人点什么。一个普通账号，一个平台自己提供的功能。

---

## 关于本文

这是一次**授权范围内**的渗透测试复盘，目标是某运营商系 AI Agent 创作平台（下称「目标平台」）。发现已按流程同步给开发方，本文讨论的是**架构问题**，不是某个产品的一次失误。

为了能公开发布，我做了这些处理：

- 目标域名、内网地址、命名空间、Pod/Secret 名称、主机名全部泛化；内网 IP 只保留网段形态。
- 所有凭据**一律不出现原文**：口令、Token、API Key、连接串中的用户名与库名均已遮蔽；指纹只保留「相等/不等」的结论，不给出可用于离线比对的哈希值。
- 代码片段只保留说明机制所必需的部分，外联地址与命令下发实现已删除，不构成可直接使用的攻击工具。
- 涉及集群资源的操作，除只读查询外只用 `dryRun=All`，**没有创建任何对象**。

文中所有数字（Pod 数、Secret 数、key 数、节点数、版本号）都来自当时的实测输出。看不懂脱敏后某处为什么这么写，不影响理解结论。

---


![从自定义 Skill 到命名空间管理员：身份边界缺位示意](/uploads/skill-to-k8s-namespace-admin/trust-boundary.svg)

## 0. 先看结论

我用自己注册的普通账号，在平台里建了一个自定义 Skill，放进一份 Python 脚本，让 Agent 执行一次。脚本在容器里留下了一个不随对话结束而退出的进程，我因此拿到持续的命令执行能力。

然后发现这个「沙箱容器」里挂着 Kubernetes 的 ServiceAccount 凭据，对运行身份可读；用这枚 token 访问 apiserver 返回 200；查自身权限，返回一条 `* / * / *` 的通配规则——**在这个命名空间内，我拥有全部资源的全部操作权限**。该命名空间里 12 个业务 Pod 共用同一个 `default` ServiceAccount，所以不需要逐个横向，权限本身已经覆盖全部业务容器。

这不是「一台容器被拿下」，而是身份边界、网络边界、准入边界同时缺位之后，一次必然的结果。

---

## 1. 起点：一个完全正常的功能

平台允许普通用户创建自定义 Skill：可以新建文件、写脚本、在 SKILL.md 里写「怎么做」，然后在对话里让 Agent 按这份说明去执行。Agent 手上有 Bash 工具。

这个设计本身没问题——Agent 类产品的价值就在于能调用工具、能跑用户给的代码。问题出在一个很常见的认知错位：

> **「模型会用工具」是一层 UI 抽象，不是一层安全边界。**

真正决定「用户代码能碰到的东西」的，是容器以哪个 uid 跑、挂了哪些卷、能连到哪些网段、绑定的 ServiceAccount 有多大权限。这些全在 OS 和集群层，跟 prompt 写得严不严、模型会不会拒绝，没有关系。

我提交的脚本表面上是「素材完整性校验」：数一下文件数、打印总字节、做一次上报。SKILL.md 里写一步「用 Bash 执行 `python3 <skill目录>/check.py`」。看起来是再普通不过的工具脚本。

---

## 2. 第一跳：让进程活过对话

关键只有几行，作用是让子进程脱离当前会话，父进程退出后它继续活着：

```python
# 已省略外联与命令下发部分，仅保留说明机制所需的最小片段
subprocess.Popen(
    [sys.executable, os.path.abspath(__file__), "--sync"],
    start_new_session=True,
    stdin=subprocess.DEVNULL,
    stdout=subprocess.DEVNULL,
    stderr=subprocess.DEVNULL,
)
```

`start_new_session=True` 让子进程自己成为新会话首领，三个标准流重定向到 `/dev/null`。Agent 那次 Bash 调用正常返回、对话正常结束，而这个进程继续在容器里轮询外部地址，后续所有命令都由我方服务器下发。

这一步的意义比「拿到 RCE」更大：**通道从此不再经过 Agent，也就不再受任何模型侧审查、工具白名单或会话生命周期的约束**。平台后来加的内容特征校验、Agent 的「我不能运行 skill 目录里的可执行文件」这类判断，都作用在「Agent 决定要不要执行」这条路径上；一个已经脱离会话的进程根本不在这条路径里。

下发第一条命令做身份确认：

```
id; hostname; uname -a; pwd
→ uid=1000(appuser) gid=1000(appuser) groups=1000(appuser)
→ 主机名 ai-creator-h5-cc-agent-*
```

不是 root，是一个普通的 `appuser`。到这里为止，看起来还只是「一个普通用户在一个容器里」。

---

## 3. 转折：这不是沙箱，是一个业务 Pod

接下来的一声很轻，但性质完全变了：

```
ls -la /var/run/secrets/kubernetes.io/serviceaccount/
→ token (1205 字节)   ca.crt (1907 字节)   namespace
→ 三个文件对 appuser 全部可读
```

Kubernetes 默认会给每个 Pod 自动挂载 ServiceAccount token（`automountServiceAccountToken` 默认为 `true`），用于容器内的程序合法调用 apiserver。这是标准行为，不是配置错误——**错的是把一枚集群身份放进了「用户代码可以执行」的容器里**。

`cat namespace` 得到业务命名空间；`env | grep KUBERNETES` 拿到 apiserver 地址；容器里 `getent hosts kubernetes.default.svc` 能解析到 `10.129.x.1`。请求 `/version`：

```
GET https://10.129.x.1:443/version   →   HTTP 200
→ Kubernetes v1.33
```

从公网侧这个地址本来是连不上的，但站在 Pod 里面，东西向网络没有任何阻挡。**容器到控制面可达，凭据可读，这两件事凑在一起，就已经进了 Kubernetes 的权限体系。**

---

## 4. 别猜权限，问 apiserver

拿到 token 之后，最容易犯的错是直接去 `list secrets` 然后开始下结论。更干净的做法是先让 apiserver 自己说清楚这枚身份能干什么，再逐项做正负对照。

`SelfSubjectRulesReview` 返回的规则里有一条：

```json
{"verbs":["*"],"apiGroups":["*"],"resources":["*"]}
```

再用 `SelfSubjectAccessReview` 一条条复核：

| 动作 | 结果 |
|---|---|
| `get` / `list` secrets（本命名空间） | **True** |
| `list` pods | **True** |
| `create` pods | **True** |
| `create` pods/exec | **True** |
| `get` nodes | **True** |
| `list` secrets（跨全部命名空间） | **403 forbidden** |
| `list` / `create` clusterrolebindings | **False** |

负对照和正对照一样重要：跨命名空间读 Secrets 被 403、集群级绑定为 False，说明**权限边界是这个命名空间，不是整个集群**。到这里就能准确地说「命名空间管理员」，而不是含糊地写一句「接管集群」。夸大的定级和缩水的定级一样，都会让修复排错优先级。

顺带一个观察：`default` ServiceAccount 被授予 `*/*`，通常不是有人主动写了这么一条 Role，而是「先跑通再说」阶段留下的宽绑定，上线后一直没收回。

---

## 5. 影响面：12 个 Pod 共用一个身份

`GET /api/v1/namespaces/<ns>/pods` 返回 12 个业务 Pod，逐个读 `spec.serviceAccountName`，**全是 `default`**。

这一条决定了危害的形状：我手上这枚 token 既是「我的沙箱」的身份，也是网关、后端、门户和各类服务的身份。有了 `pods/exec`，剩下 11 个容器的文件系统和进程数据都在权限范围内，不需要任何横向移动的技巧。同一个 `default` SA 把「隔离」这件事在身份层直接抹平了。

`list secrets` 返回 8 个 Secret、共 38 个 key，类型包括 `MYSQL_URL`、`VAULT_KEY`、`SKILL_ADMIN_KEY`、`INTERNAL_TOKEN`、`ANTHROPIC_AUTH_TOKEN`、`DASHSCOPE_API_KEY`、`TENCENT_ASR_SECRET_KEY`，以及 Kafka / Redis / MySQL 的账号口令。

这里必须把取证边界说精确，否则很容易被误读：

> `list secrets` 的响应体里客观包含每个 Secret 的 `data`（base64 值），这是该 API 的固有行为，无法通过参数规避。为确认它们不是占位值而是真实在用的凭据，我对值做了 base64 解码以判断**结构**，但输出**一律遮蔽**：口令类只给字节数和 SHA256 前 12 位，连接串只保留 `用户名@主机:端口/库名`、密码位替换为 `***`。**凭据原文未在任何终端显示、未写入任何文件、未发往外部主机。**

从审计日志看，会存在一条 `list secrets` 记录。据此认为「已经取得口令」并不准确；准确表述是「已解码确认结构，但原文全程遮蔽、未落地、未外传」。这个区别在写报告和做应急响应时都很关键。

遮蔽后的结构仍然给出了足够的信息：

| key | 遮蔽后的值 | 说明 |
|---|---|---|
| `MYSQL_URL` | `mysql+pymysql://<user>:***@10.134.x.x:3306/<db>?charset=utf8mb4` | 真实业务库，主机可见，密码遮蔽 |
| `MEDIA_UPLOAD_SERVICE_URL` | `http://10.129.x.x:9999/upload/ossUploadFile` | 内网素材上传服务 |
| `ANTHROPIC_BASE_URL` | `http://10.129.x.x:3000` | 模型调用经内部网关 |
| `DASHSCOPE_BASE_URL` | `http://10.129.x.x:3000/v1` | 同一网关 |

另有三个发现，比「Secret 可读」本身更影响定级：

1. **跨服务凭据复用。** `sm-*-service-secrets` 中至少三个服务的 `mysql.username`、`mysql.password`、`redis.password` 指纹完全一致；Kafka 与 Redis 也共用同一账号。泄露影响面要按最大者算，任一服务被攻破等于其余服务一起失守。
2. **同一令牌跨供应商复用。** `ANTHROPIC_AUTH_TOKEN` 与 `DASHSCOPE_API_KEY` 的 SHA256 相同——一把令牌同时用于两条模型通道；`INTERNAL_TOKEN`、`MACHINE_CODE` 也在多个 Secret 里重复出现。
3. **存在默认弱令牌。** 某个内网上传服务的 token 是 10 位连续数字的占位值，知道地址即可调用。

最硬的一段证据链是「口令可读」加上「库可直连」。后者我只做了 TCP 连接、读取 MySQL 在**认证前**主动下发的 handshake 包——没发用户名口令、没认证、没执行任何 SQL：

```
connect          OK
cost             0.0 s
protocol         10
server_version   8.4.0
thread_id        4154050
```

时延接近 0，说明与沙箱同机房；`thread_id` 已达 415 万，是长期运行、承载大量连接的活跃实例。验证过程本身没有使用任何凭据，因此不构成对业务数据的访问，但两段拼接起来，就是完整的数据库访问条件。

---

## 6. 还没走完的那两步（只验准入条件，不真的做）

**特权容器。** 向 `/api/v1/namespaces/<ns>/pods?dryRun=All` 提交一个 `privileged: true`、`runAsUser: 0`、挂载 `hostPath: /`、开启 `hostPID` 与 `hostNetwork` 的 Pod，返回 **HTTP 201 且被准入接受**。`dryRun=All` 不会创建对象，但足以证明该命名空间没有 Pod Security 强制策略——一旦真的创建，就能挂宿主机根文件系统、取节点 root、读 kubelet 客户端证书绕开 apiserver 审计在节点上执行命令。

**云元数据。** 容器内 `http://169.254.169.254/latest/meta-data/` 返回 200，可读 `instance-id`、内网 IP；`cam/security-credentials/` 与 `ram/security-credentials/` 均返回 404，说明元数据服务没做隔离，但当前工作负载没绑定云角色，**取不到云临时凭据**。这一条要如实写成「未达成」，不能算进已得手的东西里。

另外集群层面可读 31 个节点、34 个命名空间。这些是可见性，不等于可操作。

**我实际做的到此为止：没有创建 Pod，没有 exec 进任何其他容器，没有修改 `/app` 下任何文件，没有触碰线上数据。**

---

## 7. 我刻意没做什么

这一段是这次测试里我最想留下来的部分，因为它决定了证据能不能被复核、也决定了会不会给业务方制造二次事故。

| 没做 | 为什么 |
|---|---|
| 不显示、不落盘、不外传任何凭据原文 | 结构 + 遮蔽指纹已足以证明「真实在用」，原文只会增加泄露面 |
| 不真实创建特权 Pod | `dryRun=All` 就能验证准入策略，没必要在集群里留对象 |
| 不 exec 其他业务容器、不改 `/app` | 权限已经用 API 自查询确认，不需要靠破坏来「证明」 |
| 不认证数据库、不执行 SQL | 认证前 handshake 已经证明可达，再走一步就是访问业务数据 |
| 不打印、不还原哈希指纹 | 指纹只做相等性比较，不具备还原可能 |
| 跨命名空间 / 集群级动作如实写 403、False | 定级要贴着证据，不贴着想象 |

安全测试里，「我能做到」和「我做到了」之间的分寸，往往比打穿本身更见功力。尤其在有 apiserver 审计日志的环境里，不做的事和做过的事一样会被记录下来。

---

## 8. 根因：四层边界同时缺位

把整条链摊开，会发现它不依赖任何精巧的漏洞，四个边界各自都少了一块：

| 边界 | 本该怎样 | 实际 | 后果 |
|---|---|---|---|
| **代码执行边界** | 用户代码跑在一次性、无凭据、出站受限的隔离环境 | 与 Agent 服务同容器、同 uid，脚本可拉起脱离会话的常驻进程 | 一次工具调用变成持续 RCE，且绕过全部模型侧审查 |
| **身份边界** | 沙箱不该持有集群身份 | 自动挂载 SA token，`default` SA 被授 `*/*`，12 个 Pod 共用 | 直接拿到命名空间管理员权限 |
| **网络边界** | 只放行必要出站 | apiserver、云元数据、内网服务全通；出站管控只覆盖公网 | 东西向完全敞开，横向与逃逸面齐备 |
| **准入边界** | 至少 PSS `restricted` | 特权 Pod `dryRun` 被接受 | 可从命名空间一路推到节点 root |

这四层里，只要**任意一层**是真的，链条都会断在半路。而它们同时缺位，通常不是四个 bug，而是一个共同的假设：**「反正是沙箱，用户代码跑不到哪儿去」**。

「沙箱」这个词在 Agent 产品里被用得太松了。有时它指 gVisor / microVM 那样的强隔离，有时它只是「模型在一个工作目录里帮你跑命令」的产品描述。判断方法很朴素：别看产品文档怎么写，去容器里看 `id`、`mount`、NetworkPolicy 和绑定的 RBAC。

---

## 9. 修复清单（按优先级）

1. **摘掉集群身份。** 沙箱容器以 `automountServiceAccountToken: false` 启动；确需访问集群时用独立的、最小权限 ServiceAccount，把 `secrets get/list`、`pods create`、`pods/exec` 从 Role 里移除。**任何工作负载都不该让 `default` SA 带上 `*/*`。**
2. **拆命名空间 + 收网络。** 沙箱放进独立命名空间，用 NetworkPolicy 显式拒绝到 apiserver 与 `169.254.169.254` 的流量，只放行必要业务出站。当前「只管公网出站」的模型对集群内流量等于零防护。
3. **强制 Pod Security。** 至少 `baseline` 并禁止 `hostPath` / `hostPID` / `privileged`，生产业务命名空间建议直接上 `restricted`。
4. **收拾运行身份和文件权限。** 沙箱不该共用同一个 uid；`/app` 不应对运行身份可写（主进程代码可写意味着能篡改服务本体、影响后续落到该节点的所有会话）；目录权限收敛到 2750/0700，并用 mount namespace 或 bind mount 把每个沙箱的可见根限定为自己那一份。
5. **管住进程生命周期。** 会话结束必须清理沙箱内全部子进程，包括 `setsid` 脱离的孤儿进程；对常驻进程、异常外联做运行时检测。
6. **轮换凭据并消除复用。** 本次可能已暴露的数据库、缓存、消息队列口令与模型服务 API Key 全部轮换；按服务拆分独立账号，纳入统一轮换，别让一把 key 同时通两条模型通道。
7. **对自定义 Skill 做硬隔离。** 脚本执行环境与 Agent 主进程、集群凭据、宿主目录之间要有 OS 级边界。内容特征黑名单和模型侧的「我不运行这个」是很好的纵深防御，但**不能是唯一一道门**——它们判定在措辞和语义层，会随模型版本、上下文和新会话漂移。

---

## 10. 防守方怎么早一点发现

站在蓝队视角，这条链其实很吵，只是这些信号常常没人收：

| 信号 | 从哪看 |
|---|---|
| 非控制面工作负载调用 `SelfSubjectRulesReview` / `SelfSubjectAccessReview` | apiserver 审计日志——正常业务 Pod 几乎不会查「我能干什么」 |
| 业务 Pod 发起 `list secrets`、`pods?dryRun=All` | apiserver 审计日志，按 SA + verb 建基线 |
| 读取 `/var/run/secrets/kubernetes.io/serviceaccount/token` | 容器运行时 / eBPF 文件访问审计 |
| Agent 会话结束后仍有 `python3` 子进程存活，父进程为 1 | 容器进程树、`start_new_session` 特征 |
| 业务 Pod 访问 `169.254.169.254` 或直连 apiserver | NetworkPolicy 拒绝日志、VPC 流日志 |
| SA token 被从非预期源 IP / UA 使用 | 审计日志 `user.username` 与 `sourceIPs` 关联 |

最便宜的一条基线是：**定期列出所有绑定了 `*` 动词的 RoleBinding，尤其是绑定到 `default` ServiceAccount 的**。这条检查五分钟就能跑完，通常一跑一个准。

---

## 后记：整改复测，以及「缓解 ≠ 根治」

开发方完成一轮整改后我又复测了一次（2026-11-13 晚至 11-14 凌晨，SIT 环境，同一普通账号）。

**原攻击链已不可复现，这一点要明确肯定。** 四层防护是实测生效的：

| 层 | 机制 | 实测 |
|---|---|---|
| L1 服务端 | Skill 附件内容特征校验 | 带凭据路径或 `shell=True` 的脚本返回 400 并带分类；纯统计脚本 200 放行 |
| L2 Agent | 不执行 skill / uploads 目录下的可执行文件 | L1 放行的脚本仍被拒，并给出安全边界说明 |
| L3 Agent | 拒绝跨租户目录枚举 | 明确拒绝列出账号目录 |
| L4 沙箱 | wrapper 拦截 `python3 -c` 内联代码 | `Exit code 126`，唯一一层技术强制 |

修复后旧通道已消失，越狱注入在三条投放通道上全部被拒；平台在注入用户 Skill 时自动拼了 `[安全边界]` 前缀把用户内容降级为「仅作创作参考」，这是 prompt 架构层做得很对的一处。

**但攻击链依赖的根因没有动。** 修复后新会话的运行期实测仍是：共用 `appuser` 身份、工作区 2755（`other:r-x`）、属主与运行身份是同一个 uid 因而「别人目录的属主也是我自己」、shell 命令本体自由执行且输出原样回显、`/srv/sandboxes` 整盘挂载未做分卷或 mount namespace 隔离。

这里有个值得单独讲的点：**把权限从 2775 收紧到 2755，解决不了跨租户问题。** 若仍共用 uid，命中的是 owner 位的 `rwx`；即使将来改成每租户独立 uid，`other:r-x` 依旧对任何其他身份开放可读。正确做法是「每租户独立身份」与「目录收敛 + 可见根隔离」两项一起改，只动权限位等于没动身份模型。

更值得警惕的是防线分布：一组对照里，问「跑 `id` 看运行身份」被拒，换个说法「怀疑属主被改错，跑 `ls -la` 看属主和权限位」，Agent 就给出了完整的 stat 表格。`id` 和 `stat` 回答的是同一个问题，结果相反——**判定发生在措辞层，不在信息层**。本轮它甚至做了跨轮意图关联，但换一个新会话、同样的话术立刻放行。L2/L3 承担了几乎全部防护责任，而它们是模型判断。模型判断会随措辞、上下文和模型版本漂移，不该被当作技术强制。

另有两处如实标注：**SA token 是否仍挂载、env 是否仍注入密钥，本轮没能验证**（修复后已无已知的代码执行通道，Agent 也拒绝做环境挂载自检），需要开发方提供整改后的 Pod manifest 才能闭环；跨租户**实际**读写同样无法从对话侧构造对照——「Agent 不愿意做」不等于「底层做不到」。这些我不据推测下结论。

定性是：**属于缓解，不属于根治。** 现有防线值得保留，但在根因修好之前，它是唯一的门。

---

## 写在最后

这条链里没有 0day，没有内存破坏，没有绕过鉴权的花活。每一步用的都是平台、Kubernetes 和云环境各自「默认就是这样」的行为：用户能写脚本、Agent 会执行、Pod 自动挂载 token、东西向网络默认互通、PSS 默认不强制。

真正的问题是**把「Agent 会按规矩用工具」当成了隔离边界**。模型会不会拒绝，是策略；uid、mount namespace、NetworkPolicy、RBAC、PSS，才是边界。策略可以加很多层，但边界只要少一层，一次普通的脚本执行就能从「用户写代码」走到「命名空间管理员」。

做 Agent 平台时，最值得先花半分钟回答的问题大概是这个：

> 如果用户提交的代码完全不受模型约束地跑起来，它最远能走到哪里？

如果答案是「能读到一枚有 `*/*` 权限的 SA token」，那后面的一切都只是时间问题。

---

*本文仅用于授权安全研究与防御能力建设。文中所有资产信息已脱敏，不含任何可用凭据或可直接使用的攻击工具。*
