# Release Checklist

1. Update the package version in `package.json`.
2. Review the changelog or release notes you want to publish.
3. Run:

```sh
npm test
npm run build-client
npm run test:browser
```

4. Verify the package contents before publishing:

```sh
npm pack --dry-run
```

Optional: build the standalone binaries locally.

```sh
npm run build:binaries
```

5. Commit the release changes and create a git tag matching the version.
6. Publish the GitHub release for that tag.
This triggers the `Release Assets` workflow, which builds and uploads:
- `qr-file-share-linux`
- `qr-file-share-macos`
- `qr-file-share-win.exe`

7. Publish to npm from GitHub Actions with the `Publish` workflow, or publish locally:

```sh
npm publish --access public
```

8. Confirm the published version on npm and test a fresh global install:

```sh
npm i -g @robmcelhinney/qr-file-share@latest
qr-file-share --help
```
