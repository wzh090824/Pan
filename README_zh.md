# Pan 文件云盘

Pan 是用于存储和分享任意格式文件的自托管网盘。图片和视频通过直链打开；文档、安装包、压缩包等文件进入 Pan 下载页，查看文件信息后再下载。

## 功能

- 通过浏览器管理界面上传、整理、重命名和下载文件。
- 图片和视频保持直链；其他文件类型使用独立下载页。
- 支持任意文件格式，并保留安全文件名和 MIME 类型。
- 支持 Docker、Cloudflare Pages 和 Cloudflare Workers 部署。
- 支持本地磁盘、Cloudflare R2、S3 兼容存储、WebDAV、Telegram、Discord 和 Hugging Face。
- 提供 HTTP 上传接口和 WebDAV，可连接兼容客户端。

## 快速开始

Docker Compose 会构建本仓库代码，并将数据库和本地文件保存在 `./data`：

```sh
git clone https://github.com/wzh090824/Pan.git
cd Pan
cp .env.example .env
```

在 `.env` 中设置强随机 `AUTH_CODE` 和 `BASIC_PASS`，然后启动：

```sh
docker compose up -d --build
```

打开 `http://localhost:7658`，并在 `/adminLogin` 使用 `.env` 中的 `BASIC_USER` 和 `BASIC_PASS` 登录。

查看[部署指南](docs/DEPLOYMENT_zh.md)，了解 Docker、Cloudflare Pages 网页部署、Cloudflare Workers、存储绑定和安全配置。English: [Deployment guide](docs/DEPLOYMENT.md)。

## 上传与下载

可以通过网页、WebDAV 客户端或 HTTP API 上传。配置 Cloudflare R2 存储通道后，可用以下命令上传文件：

```sh
curl -F "file=@./backup.7z" "https://your-domain/upload?uploadChannel=cfr2"
```

接口会返回文件的 `src` 地址。图片和视频通过该地址直链打开；其他格式显示 Pan 文件页。追加 `?download=1` 可直接下载文件内容。将服务公开前，请在安全设置或 `AUTH_CODE` 环境变量中设置上传访问码。

## 存储

Docker 将 SQLite 数据库和本地文件保存在 `./data`。Cloudflare Pages 和 Workers 使用 D1 或 KV 保存元数据，使用 R2 保存文件内容。部署后在管理设置中选择存储通道。

## 许可

Pan 基于 [CloudFlare ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) 改造，并保留其 MIT 许可和版权声明，详见 [LICENSE](LICENSE)。
