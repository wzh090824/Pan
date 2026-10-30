function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character]);
}

function getFileSizeBytes(metadata) {
    const bytes = Number(metadata?.FileSizeBytes);
    if (Number.isFinite(bytes) && bytes >= 0) return bytes;

    const megabytes = Number(metadata?.FileSize);
    return Number.isFinite(megabytes) && megabytes >= 0 ? megabytes * 1024 * 1024 : null;
}

function formatFileSize(bytes, locale) {
    if (bytes === null) return locale === 'zh-CN' ? '未知' : 'Unknown';
    const units = locale === 'zh-CN' ? ['字节', 'KB', 'MB', 'GB', 'TB'] : ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes < 1024) return `${Math.floor(bytes)} ${units[0]}`;

    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** exponent);
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${units[exponent]}`;
}

function formatUploadedAt(timestamp, locale) {
    const value = Number(timestamp);
    if (!Number.isFinite(value) || value <= 0) return null;

    const date = new Date(value < 100000000000 ? value * 1000 : value);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function createFileLandingPageResponse({ request, url, fileName, fileType, metadata = {} }) {
    const locale = request.headers.get('Accept-Language')?.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
    const isChinese = locale === 'zh-CN';
    const extension = fileName.includes('.') ? fileName.split('.').pop().slice(0, 8).toUpperCase() : 'FILE';
    const downloadUrl = new URL(url.href);
    downloadUrl.searchParams.set('download', '1');
    const uploadedAt = formatUploadedAt(metadata.TimeStamp, locale);
    const dateRow = uploadedAt
        ? `<div class="detail"><dt>${isChinese ? '上传时间' : 'Uploaded'}</dt><dd>${escapeHtml(uploadedAt)}</dd></div>`
        : '';
    const title = isChinese ? '文件下载' : 'File download';
    const fileLabel = isChinese ? '文件' : 'FILE';
    const description = isChinese ? '文件已安全保存，可下载到本地。' : 'This file is ready to download.';
    const downloadLabel = isChinese ? '下载文件' : 'Download file';
    const sizeLabel = isChinese ? '大小' : 'Size';
    const typeLabel = isChinese ? '文件类型' : 'File type';
    const size = formatFileSize(getFileSizeBytes(metadata), locale);
    const fileTypeLabel = fileType || (isChinese ? '未知' : 'Unknown');

    const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#f2f5f3">
<title>${escapeHtml(fileName)} - Pan</title>
<style>
:root{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#17211f;background:#f2f5f3;font-synthesis:none;text-rendering:optimizeLegibility}
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;grid-template-rows:auto 1fr auto;background:#f2f5f3}
header,footer{width:min(100% - 40px,720px);margin:0 auto}
header{height:72px;display:flex;align-items:center;gap:10px;font-size:19px;font-weight:700;color:#1c3935}
.brand{width:30px;height:30px;display:grid;place-items:center;border-radius:7px;background:#176b5b;color:#fff;font-size:16px}
main{width:min(100% - 32px,560px);margin:auto;padding:34px 0}
.panel{background:#fff;border:1px solid #dce5e1;border-radius:8px;padding:clamp(24px,6vw,40px);box-shadow:0 12px 32px rgba(23,52,45,.07)}
.file-icon{width:58px;height:66px;display:grid;place-items:center;margin-bottom:26px;border:1px solid #c8d8d2;border-radius:7px;background:#f2f8f5;color:#176b5b;font-size:12px;font-weight:800;overflow-wrap:anywhere;text-align:center;padding:6px}
.eyebrow{margin:0 0 8px;color:#58716a;font-size:12px;font-weight:700;letter-spacing:0}
h1{margin:0;font-size:clamp(22px,5vw,30px);line-height:1.25;overflow-wrap:anywhere;letter-spacing:0}
.description{margin:12px 0 28px;color:#53635f;line-height:1.6}
dl{margin:0 0 28px;border-top:1px solid #e8eeeb}
.detail{display:grid;grid-template-columns:minmax(100px,34%) 1fr;gap:12px;padding:13px 0;border-bottom:1px solid #e8eeeb;line-height:1.45}
dt{color:#687873}dd{margin:0;color:#263531;overflow-wrap:anywhere}
.download{min-height:48px;width:100%;display:flex;align-items:center;justify-content:center;border-radius:6px;background:#176b5b;color:#fff;text-decoration:none;font-weight:700}
.download:hover{background:#105748}.download:focus-visible{outline:3px solid #7bc4aa;outline-offset:3px}
footer{padding:0 0 24px;color:#75837e;font-size:13px}
@media(max-width:420px){header,footer{width:calc(100% - 32px)}.detail{grid-template-columns:1fr;gap:4px}}
</style>
</head>
<body>
<header><span class="brand" aria-hidden="true">P</span><span>Pan</span></header>
<main><section class="panel" aria-labelledby="file-name">
<div class="file-icon" aria-hidden="true">${escapeHtml(extension)}</div>
<p class="eyebrow">${fileLabel}</p>
<h1 id="file-name">${escapeHtml(fileName)}</h1>
<p class="description">${description}</p>
<dl>
<div class="detail"><dt>${sizeLabel}</dt><dd>${escapeHtml(size)}</dd></div>
<div class="detail"><dt>${typeLabel}</dt><dd>${escapeHtml(fileTypeLabel)}</dd></div>
${dateRow}
</dl>
<a class="download" href="${escapeHtml(downloadUrl.pathname + downloadUrl.search)}" download="${escapeHtml(fileName)}">${downloadLabel}</a>
</section></main>
<footer>Pan</footer>
</body>
</html>`;

    return new Response(html, {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'private, no-store, max-age=0',
            'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
            'Referrer-Policy': 'no-referrer',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
        },
    });
}
