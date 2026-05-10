# 魔方财务 V3 服务器监控 Worker 版

这是 `server_monitor.py` 的 Cloudflare Worker/D1 版本：用 Cron Trigger 定时检查魔方财务 API 状态，异常达到阈值后调用 `hard_reboot`，并可通过 Webhook 或 pushplus 通知。

## 已实现

- Cron 定时检查，默认 `*/5 * * * *`
- D1 持久化：服务商、服务器、运行状态、事件、设置
- 5 状态机：`healthy -> suspect -> down -> rebooting -> recovering`
- 魔方财务 API：
  - `POST /v1/login_api?account=xx&password=xx`
  - `GET /v1/hosts/:id/module/status?type=host`
  - `PUT /v1/hosts/:id/module/hard_reboot`
- 管理 API：
  - `POST /api/admin/providers`
  - `POST /api/admin/servers`
  - `POST /api/admin/settings`
  - `POST /api/admin/run`
- 公共状态 API：
  - `GET /api/status`

## 限制

Cloudflare Worker 不能执行本机 ICMP `ping`，所以当前 Worker 版只支持 `api_only`。原 Python 里的 `ping_only`、`ping_then_api`、`api_then_ping` 不适用于 Worker。

## 快速部署（5 步完成）

无需修改任何代码或配置文件，即可部署专属于你的魔方财务监控实例。

### 第 1 步 — Fork 仓库

点击本仓库右上角的 **Fork** 按钮，创建你自己的副本。

### 第 2 步 — 创建 Cloudflare API Token

前往 **Cloudflare Dashboard → API Tokens**，点击 **Create Token**，使用 **Edit Cloudflare Workers** 模板，并确认包含：

| 权限 | 级别 |
|------|------|
| Account / Workers Scripts | Edit |
| Account / D1 | Edit |
| Account / Account Settings | Read |
| User / User Details | Read |

### 第 3 步 — 添加 GitHub Secrets

进入你 Fork 的仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加：

| Secret 名称 | 值 | 是否必填 |
|-------------|----|----------|
| `CLOUDFLARE_API_TOKEN` | 第 2 步获取的 Token | 必填 |
| `ZJMF_ADMIN_TOKEN` | 任意强密码字符串 | 必填 |
| `CLOUDFLARE_ACCOUNT_ID` | 你的 Cloudflare Account ID | 推荐 |
| `ZJMF_API_ACCOUNT` | 魔方财务登录邮箱或手机号 | 必填 |
| `ZJMF_API_PASSWORD` | 魔方财务 API 密钥 | 必填 |
| `ZJMF_SERVER_ID` | 魔方财务产品 ID | 必填 |
| `ZJMF_SERVER_IP` | 服务器 IP | 推荐 |
| `PUSHPLUS_TOKEN` | pushplus 用户 token | 可选 |

### 第 4 步 — 运行 GitHub Actions

进入 **Actions → Deploy to Cloudflare → Run workflow**。

工作流会自动完成：

- 创建或复用 D1 数据库
- 执行 D1 迁移
- 注入 `ADMIN_TOKEN` 为 Worker Secret
- 部署 Worker（状态页 UI + API + 定时监控任务）
- 自动添加服务商、服务器监控配置
- 如果填写了 `PUSHPLUS_TOKEN`，会自动添加 pushplus 通知

### 第 5 步 — 访问你的状态页

工作流成功后，在日志最后查看地址：

- 状态页：`https://<你的仓库名>.<你的 workers.dev 子域>.workers.dev/`
- API：`https://<你的仓库名>.<你的 workers.dev 子域>.workers.dev/api/status`

## 本地测试

```powershell
cd D:\自建功能\魔方财务V3通用云服务器监控异常重启\cloudflare-worker
npm test
```

当前验证结果：`20` 个测试全部通过。

## 部署前校验

```powershell
npx wrangler@latest deploy --dry-run --outdir .wrangler-dry-run
```

当前已通过 dry-run 打包校验，上传包大小约 `29.82 KiB`。

## 部署步骤

### 1. 登录 Cloudflare

```powershell
npx wrangler@latest login
```

如果是在非交互环境，改用 `CLOUDFLARE_API_TOKEN`：

```powershell
$env:CLOUDFLARE_API_TOKEN = "你的 Cloudflare API Token"
```

### 2. 创建 D1 数据库

```powershell
npx wrangler@latest d1 create zjmf-monitor
```

把输出里的 `database_id` 填入 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "zjmf-monitor"
database_id = "你的 database_id"
```

### 3. 设置管理 Token

```powershell
npx wrangler@latest secret put ADMIN_TOKEN
```

输入你想用的管理后台 token。

### 4. 应用 D1 迁移

```powershell
npx wrangler@latest d1 migrations apply zjmf-monitor --remote
```

### 5. 部署 Worker

```powershell
npx wrangler@latest deploy
```

## 初始化配置

以下示例里的 `$base` 换成部署后的 Worker 地址，`$token` 换成 `ADMIN_TOKEN`。

### 添加服务商

```powershell
$base = "https://zjmf-monitor.<你的子域>.workers.dev"
$token = "你的 ADMIN_TOKEN"

$body = @{
  name = "heyunidc"
  display_name = "核云"
  api_base_url = "https://www.heyunidc.cn/v1"
  api_account = "登录邮箱或手机号"
  api_password = "API密钥"
} | ConvertTo-Json -Compress

Invoke-RestMethod -Method Post -Uri "$base/api/admin/providers" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body $body
```

### 添加服务器

```powershell
$body = @{
  id = "4075"
  name = "我的服务器"
  ip = "1.2.3.4"
  provider = "heyunidc"
  check_method = "api_only"
  enabled = $true
  daily_reboot_limit = 3
  scheduled_reboot = "04:00"
} | ConvertTo-Json -Compress

Invoke-RestMethod -Method Post -Uri "$base/api/admin/servers" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body $body
```

### 配置 pushplus 通知

```powershell
$body = @{
  webhook_url = "https://www.pushplus.plus/send"
  webhook_type = "pushplus"
  pushplus_token = "你的 pushplus token"
  timezone = "Asia/Shanghai"
} | ConvertTo-Json -Compress

Invoke-RestMethod -Method Post -Uri "$base/api/admin/settings" `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json; charset=utf-8" `
  -Body $body
```

### 手动触发一次检查

```powershell
Invoke-RestMethod -Method Post -Uri "$base/api/admin/run" `
  -Headers @{ Authorization = "Bearer $token" }
```

### 查看状态页 JSON

```powershell
Invoke-RestMethod -Method Get -Uri "$base/api/status"
```

## 官方文档

- Cloudflare Cron Triggers: https://developers.cloudflare.com/workers/configuration/cron-triggers/
- Cloudflare D1 Wrangler commands: https://developers.cloudflare.com/d1/wrangler-commands/
- Cloudflare Worker secrets: https://developers.cloudflare.com/workers/configuration/secrets/
