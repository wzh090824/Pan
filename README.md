# Pan

Pan is a self-hosted cloud drive for storing and sharing files of any format. Images and videos open from their direct links; documents, installers, archives, and other files use a Pan download page with file details and an explicit download action.

## Features

- Upload, organize, rename, and download files from a browser dashboard.
- Keep image and video URLs direct; share other file types through a small download page.
- Store arbitrary file formats and retain safe filenames and MIME types.
- Deploy with Docker, Cloudflare Pages, or Cloudflare Workers.
- Store objects on local disk, Cloudflare R2, S3-compatible storage, WebDAV, Telegram, Discord, or Hugging Face.
- Use the HTTP upload API or connect WebDAV clients.

## Quick Start

Docker Compose builds this repository and persists the database and local files under `./data`:

```sh
git clone https://github.com/wzh090824/Pan.git
cd Pan
cp .env.example .env
```

Set a strong `AUTH_CODE` and `BASIC_PASS` in `.env`, then start Pan:

```sh
docker compose up -d --build
```

Open `http://localhost:7658`. Sign in at `/adminLogin` with the `BASIC_USER` and `BASIC_PASS` values from `.env`.

The [deployment guide](docs/DEPLOYMENT.md) covers Docker, Cloudflare Pages dashboard deployment, Cloudflare Workers, storage bindings, and security. 简体中文：[部署指南](docs/DEPLOYMENT_zh.md)。

## Upload and Download

Upload through the browser, a WebDAV client, or the HTTP API. For example, with a Cloudflare R2 channel configured:

```sh
curl -F "file=@./backup.7z" "https://your-domain/upload?uploadChannel=cfr2"
```

The API returns a `src` URL. Images and videos open directly; other formats display the Pan file page. Append `?download=1` to download the stored bytes directly. Set an upload access code in the security settings or with `AUTH_CODE` before exposing uploads publicly.

## Storage

Docker stores its SQLite database and local objects under `./data`. Cloudflare Pages and Workers use D1 or KV for metadata and R2 for objects. Select the storage channel in the administration settings after deployment.

## License

Pan is derived from [CloudFlare ImgBed](https://github.com/MarSeventh/CloudFlare-ImgBed) and retains its MIT license and copyright notice. See [LICENSE](LICENSE).
