# Deployment

Pan supports Docker with local persistent storage, Cloudflare Pages dashboard deployment, and Cloudflare Workers. Cloudflare deployments use D1 or KV for metadata and R2 for file contents.

## Docker Compose

Requirements: Docker Engine or Docker Desktop with Docker Compose v2.

```sh
git clone https://github.com/wzh090824/Pan.git
cd Pan
cp .env.example .env
```

Edit `.env` before starting. Set a unique access code and administrator password; do not deploy with the example placeholders. Generate random values with a password manager or `openssl rand -hex 32`.

```dotenv
AUTH_CODE=replace-with-a-long-random-upload-access-code
BASIC_USER=admin
BASIC_PASS=replace-with-a-long-random-admin-password
```

Build and start the service:

```sh
docker compose up -d --build
docker compose logs -f pan
```

The web service listens on port `7658`. Open `http://localhost:7658`; the administrator login page is `/adminLogin`. Change the published port in `docker-compose.yml` if needed.

SQLite data and locally stored objects are written to `./data`, mounted at `/app/data` in the container. Back up this directory regularly. To stop the service, run `docker compose down`; this leaves `./data` in place.

PowerShell users can copy the environment template with:

```powershell
Copy-Item .env.example .env
```

## Cloudflare Pages dashboard deployment

This path connects the GitHub repository to Cloudflare Pages in the Cloudflare Dashboard. The repository-root `functions/` directory contains Pages Functions, and `frontend-dist/` contains the prebuilt web interface. Keep the project root set to the repository root; do not set it to `frontend-dist/`.

### 1. Create Cloudflare resources

Create a D1 database in the Cloudflare Dashboard, then run the contents of `database/init.sql` in its Console/query editor. For a new database, this is the only required schema file because it already includes the `tags` column. Run `database/migrations/v2.2.1_add_tags_column.sql` only when upgrading an existing database that does not have that column.

Create an R2 bucket, for example `pan-files`. D1 stores file metadata; R2 stores file contents.

### 2. Create the Pages project from GitHub

1. In the Cloudflare Dashboard, open **Workers & Pages**, create an application, then choose **Pages** and **Connect to Git**.
2. Authorize Cloudflare to access GitHub, select `wzh090824/Pan`, and choose `main` as the production branch.
3. Choose the **None** framework preset. Keep the root directory at `/`, set the build command to `npm ci`, and set the build output directory to `frontend-dist`. If the build settings expose a Node.js version variable, set `NODE_VERSION=22`.
4. Save and deploy. Cloudflare installs dependencies, reads Pages Functions from `functions/`, and publishes the frontend from `frontend-dist/`. Later pushes to `main` trigger production deployments automatically.

### 3. Add Pages bindings and secrets

After the first deployment, open **Settings → Functions → Bindings** in the Pages project. Add these bindings and select the resources created earlier:

| Binding type | Binding name | Purpose |
| --- | --- | --- |
| D1 database | `img_d1` | File metadata and settings; recommended |
| R2 bucket | `img_r2` | File contents |

You can use a KV namespace named `img_url` instead of D1 for metadata. Do not bind both: the application prefers KV when both are present. Configure required bindings separately for production and preview environments.

Under **Settings → Environment variables**, add `BASIC_USER`, `BASIC_PASS`, and `AUTH_CODE` for Pages Functions. Store passwords and access codes as encrypted secrets and configure production values. If preview deployments are enabled, configure separate credentials and required bindings for Preview as well. Do not put these values in the GitHub repository or ordinary plaintext variables.

Under **Settings → Functions**, set the compatibility date to `2024-08-21` and add the `global_fetch_strictly_public` compatibility flag to match the repository's Worker configuration.

### 4. Sign in and select storage

Open the assigned `*.pages.dev` URL and visit `/adminLogin` to sign in with the configured administrator account. Enable the Cloudflare R2 storage channel in the admin settings. To use a custom domain, add it under **Custom domains** in the Pages project.

## Cloudflare Workers

Requirements: a Cloudflare account, Node.js 22, and Wrangler 4. This guide uses D1 for metadata and configuration, plus R2 for file contents.

Install dependencies and authenticate Wrangler:

```sh
git clone https://github.com/wzh090824/Pan.git
cd Pan
npm ci
npx wrangler login
```

Create the database and bucket:

```sh
npx wrangler d1 create pan-db
npx wrangler r2 bucket create pan-files
```

Copy the `database_id` returned by Wrangler. Edit `deploy/worker/wrangler.toml` and configure the bindings with the database name, ID, and bucket name:

```toml
[[d1_databases]]
binding = "img_d1"
database_name = "pan-db"
database_id = "YOUR_D1_DATABASE_ID"

[[r2_buckets]]
binding = "img_r2"
bucket_name = "pan-files"
```

Initialize the D1 schema:

```sh
npx wrangler d1 execute pan-db --remote --file=database/init.sql
```

A new database does not need the extra migration because `init.sql` already creates the `tags` column. Run the migration SQL only when an existing D1 database is missing that column.

Deploy the Worker and set access credentials as encrypted Worker secrets:

```sh
npm run deploy:worker
npx wrangler secret put AUTH_CODE --config deploy/worker/wrangler.toml
npx wrangler secret put BASIC_USER --config deploy/worker/wrangler.toml
npx wrangler secret put BASIC_PASS --config deploy/worker/wrangler.toml
```

Wrangler prompts for each secret value. Open the Worker URL and visit `/adminLogin` to sign in. Configure the R2 channel and any other storage channels in the administration settings.

The database adapter uses KV when both KV and D1 bindings are present. Use only the binding you intend to hold metadata, or remove one binding to avoid selecting the wrong database. Keep R2 object contents and D1 metadata backed up according to your retention needs.

## Security and operations

- Configure both administrator credentials and an upload access code before making the service public. With no credentials configured, access is open.
- Store production credentials as Docker environment values or Cloudflare Worker secrets. Do not commit `.env` or secrets to Git.
- Restrict public sharing and allowed domains in the security settings if files should not be accessible to everyone with a link.
- Images and videos open directly. Other file types use the Pan download page; `?download=1` returns the file bytes with an attachment disposition. Active content such as HTML, JavaScript, and SVG is never rendered inline.
- Set up HTTPS at the public reverse proxy or use the Cloudflare Worker URL. Avoid exposing the Docker port directly to the public internet without TLS and access controls.

## Updating and backups

Before changing versions, back up the Docker `data/` directory or the Cloudflare D1 and R2 data. The Docker Compose deployment builds from the checked-out source, so rebuild after updating the source:

```sh
docker compose up -d --build
```

For Cloudflare Workers, update the source, review any database migrations, then run `npm run deploy:worker` again.
