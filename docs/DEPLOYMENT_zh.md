# 部署指南

Pan 支持 Docker 本地持久化部署、Cloudflare Pages 网页部署，以及 Cloudflare Workers 部署。Cloudflare 部署使用 D1 或 KV 保存元数据，使用 R2 保存文件内容。

## Docker Compose

需要安装 Docker Engine 或 Docker Desktop，并启用 Docker Compose v2。

```sh
git clone https://github.com/wzh090824/Pan.git
cd Pan
cp .env.example .env
```

启动前编辑 `.env`，配置独立的上传访问码和管理员密码，不要直接使用示例占位值。可以使用密码管理器生成随机值，也可以执行 `openssl rand -hex 32` 生成。

```dotenv
AUTH_CODE=替换为足够长的随机上传访问码
BASIC_USER=admin
BASIC_PASS=替换为足够长的随机管理员密码
```

构建并启动：

```sh
docker compose up -d --build
docker compose logs -f pan
```

服务监听本机 `7658` 端口。打开 `http://localhost:7658`，管理员登录页为 `/adminLogin`。如需更换端口，请修改 `docker-compose.yml` 中的映射。

SQLite 数据库和本地文件保存在宿主机 `./data`，容器内路径为 `/app/data`。请定期备份该目录。执行 `docker compose down` 停止服务时，`./data` 会保留。

PowerShell 可用以下命令复制环境模板：

```powershell
Copy-Item .env.example .env
```

## Cloudflare Pages 网页部署

此方式直接在 Cloudflare Dashboard 连接 GitHub 仓库。仓库根目录下的 `functions/` 是 Pages Functions，`frontend-dist/` 是已构建好的网页资源；请把项目根目录设为仓库根目录，不能设成 `frontend-dist/`。

### 1. 创建 Cloudflare 资源

在 Cloudflare Dashboard 的 D1 页面新建数据库，并在数据库 Console/查询页执行仓库中的 `database/init.sql`。全新数据库只需要执行该文件；它已包含 `tags` 字段。只有升级不含该字段的旧数据库时，才执行 `database/migrations/v2.2.1_add_tags_column.sql`。

在 R2 页面新建一个存储桶，例如 `pan-files`。D1 存文件元数据，R2 保存文件内容。

### 2. 从 GitHub 创建 Pages 项目

1. 打开 Cloudflare Dashboard 的 **Workers & Pages**，选择创建应用，再选择 **Pages** 和 **Connect to Git**。
2. 授权 Cloudflare 访问 GitHub 仓库，选择 `wzh090824/Pan`，生产分支选择 `main`。
3. 构建设置选择 **None** 框架预设，根目录留在仓库根目录 `/`，构建命令填写 `npm ci`，输出目录填写 `frontend-dist`。如构建设置提供 Node.js 版本变量，设置 `NODE_VERSION=22`。
4. 保存并部署。Cloudflare 会安装依赖、从仓库读取 `functions/`，并发布 `frontend-dist/` 中的前端文件。之后推送到 `main` 会自动触发生产部署。

### 3. 添加 Pages 绑定和密钥

首次部署完成后，在 Pages 项目的 **Settings → Functions → Bindings** 中添加下列绑定，并选择刚才创建的资源：

| 绑定类型 | 绑定名称 | 用途 |
| --- | --- | --- |
| D1 database | `img_d1` | 文件元数据和设置，推荐使用 |
| R2 bucket | `img_r2` | 文件内容 |

也可以用 KV namespace `img_url` 代替 D1 保存元数据；不要同时绑定 D1 和 KV，因为应用会优先使用 KV。生产和预览环境需要分别配置所需绑定。

在 **Settings → Environment variables** 中为 Pages Functions 添加 `BASIC_USER`、`BASIC_PASS` 和 `AUTH_CODE`。将密码和访问码设置为加密 Secret，并为生产环境配置；若启用预览部署，也要为 Preview 配置独立凭据和所需绑定。不要把这些值放进 GitHub 仓库或普通明文变量中。

在 **Settings → Functions** 的运行时设置中，将 Compatibility date 设为 `2024-08-21`，并添加 `global_fetch_strictly_public` 兼容标志，与仓库中的 Worker 配置保持一致。

### 4. 登录并设置存储通道

打开 Cloudflare 提供的 `*.pages.dev` 地址，再访问 `/adminLogin`，使用配置的管理员账号登录。在管理设置中启用 Cloudflare R2 存储通道。若使用自定义域名，可在 Pages 项目的 **Custom domains** 中添加。

## Cloudflare Workers

需要 Cloudflare 账号、Node.js 22 和 Wrangler 4。本指南使用 D1 保存元数据与配置，使用 R2 保存文件内容。

安装依赖并登录 Wrangler：

```sh
git clone https://github.com/wzh090824/Pan.git
cd Pan
npm ci
npx wrangler login
```

创建 D1 数据库和 R2 存储桶：

```sh
npx wrangler d1 create pan-db
npx wrangler r2 bucket create pan-files
```

复制 Wrangler 返回的 `database_id`。编辑 `deploy/worker/wrangler.toml`，填写数据库名称、ID 和存储桶名称：

```toml
[[d1_databases]]
binding = "img_d1"
database_name = "pan-db"
database_id = "填写你的 D1 数据库 ID"

[[r2_buckets]]
binding = "img_r2"
bucket_name = "pan-files"
```

初始化 D1 表结构：

```sh
npx wrangler d1 execute pan-db --remote --file=database/init.sql
```

全新数据库无需额外迁移，因为 `init.sql` 已创建 `tags` 字段。只有已有 D1 数据库缺少该字段时，才执行对应迁移 SQL。

部署 Worker，然后把访问凭据设为加密的 Worker Secret：

```sh
npm run deploy:worker
npx wrangler secret put AUTH_CODE --config deploy/worker/wrangler.toml
npx wrangler secret put BASIC_USER --config deploy/worker/wrangler.toml
npx wrangler secret put BASIC_PASS --config deploy/worker/wrangler.toml
```

Wrangler 会逐项提示输入密钥值。打开 Worker 地址并访问 `/adminLogin` 登录，然后在管理设置中配置 R2 存储通道及其他需要的存储渠道。

如果同时绑定 KV 和 D1，数据库适配器会优先使用 KV。请只绑定计划用于元数据的数据库，避免选错；并根据保留需求分别备份 R2 对象和 D1 数据。

## 安全与运维

- 对外开放前设置管理员账号、管理员密码和上传访问码。未配置凭据时，服务不会启用访问认证。
- 生产凭据应保存在 Docker 环境变量或 Cloudflare Worker Secret 中，不要把 `.env` 或密钥提交到 Git。
- 如果不希望所有持有链接的人都能访问文件，请在安全设置中限制公开分享和允许访问的域名。
- 图片和视频通过直链打开，其他文件类型显示 Pan 下载页；追加 `?download=1` 会直接返回附件内容。HTML、JavaScript、SVG 等主动内容不会以内联方式渲染。
- 配置公网反向代理或使用 Cloudflare Worker 地址提供 HTTPS。不要在没有 TLS 和访问控制的情况下直接把 Docker 端口暴露到公网。

## 更新与备份

变更版本前先备份 Docker 的 `data/` 目录，或 Cloudflare D1 与 R2 数据。Docker Compose 部署会从当前源码构建，更新源码后重新构建：

```sh
docker compose up -d --build
```

Cloudflare Workers 更新源码后，检查数据库迁移并再次执行 `npm run deploy:worker`。
