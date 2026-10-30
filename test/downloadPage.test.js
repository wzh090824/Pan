import assert from 'node:assert/strict';
import { shouldShowFileLandingPage } from '../functions/file/fileTools.js';
import { createFileLandingPageResponse } from '../functions/file/downloadPage.js';

describe('file download page', () => {
    it('keeps safe image and video formats as direct links and shows other files as a page', () => {
        const request = new Request('https://pan.test/file/file');
        const shouldShow = (fileName, fileType) => shouldShowFileLandingPage({ request, fileName, fileType });

        assert.equal(shouldShow('photo.png', 'image/png'), false);
        assert.equal(shouldShow('movie.mp4', 'video/mp4'), false);
        assert.equal(shouldShow('legacy.webp', 'application/octet-stream'), false);
        assert.equal(shouldShow('document.pdf', 'application/pdf'), true);
        assert.equal(shouldShow('installer.exe', 'application/octet-stream'), true);
        assert.equal(shouldShow('vector.svg', 'image/svg+xml'), true);
    });

    it('keeps HEAD, Range, explicit downloads, image transforms, and admin previews on the file response path', () => {
        const request = new Request('https://pan.test/file/archive.zip');
        const base = { fileName: 'archive.zip', fileType: 'application/zip' };
        assert.equal(shouldShowFileLandingPage({ ...base, request }), true);
        assert.equal(shouldShowFileLandingPage({ ...base, request: new Request(request.url, { method: 'HEAD' }) }), false);
        assert.equal(shouldShowFileLandingPage({ ...base, request: new Request(request.url, { headers: { Range: 'bytes=0-1' } }) }), false);
        assert.equal(shouldShowFileLandingPage({ ...base, request, forceDownload: true }), false);
        assert.equal(shouldShowFileLandingPage({ ...base, request, isAdminPreview: true }), false);
        assert.equal(shouldShowFileLandingPage({ ...base, request, imageTransformRequested: true }), false);
    });

    it('escapes metadata and exposes the explicit download URL without embedding remote content', async () => {
        const url = new URL('https://pan.test/file/report%3Cscript%3E.pdf?token=one');
        const response = createFileLandingPageResponse({
            request: new Request(url, { headers: { 'Accept-Language': 'zh-CN' } }),
            url,
            fileName: '<script>alert(1)</script>.pdf',
            fileType: 'application/pdf',
            metadata: { FileSizeBytes: 1536, TimeStamp: 1782800000000 },
        });
        const html = await response.text();

        assert.equal(response.headers.get('Cache-Control'), 'private, no-store, max-age=0');
        assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
        assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;\.pdf/);
        assert.doesNotMatch(html, /<script>alert\(1\)/);
        assert.match(html, /Pan/);
        assert.match(html, /下载文件/);
        assert.match(html, /\/file\/report%3Cscript%3E\.pdf\?token=one&amp;download=1/);
        assert.match(html, /1\.5 KB/);
    });
});
