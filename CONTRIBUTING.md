# Contributing to Pan

Pan is maintained in this repository. Changes should preserve the self-hosted file storage workflow and keep deployment documentation, tests, and supported adapters in sync with the code.

## Development

Use Node.js 22 from the repository root:

```sh
npm ci
npm test
npm run test:server
```

The test suite uses isolated in-memory databases and storage doubles. It does not need cloud credentials or production data.

## Pull requests

- Explain the user-visible behavior and the reason for the change.
- Add focused regression coverage for changed behavior.
- Update `test/README.md` when test cases, helpers, or coverage limits change.
- Update `README.md`, `README_zh.md`, or the deployment guides when setup or product behavior changes.
- Keep credentials and personal files out of commits.

## License

Contributions are distributed under the repository's MIT license. Retain the required notices for third-party code and assets.
