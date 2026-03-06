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

5. Commit the release changes and create a git tag matching the version.
6. Publish from GitHub Actions with the `Publish` workflow, or publish locally:

```sh
npm publish --access public
```

7. Confirm the published version on npm and test a fresh global install:

```sh
npm i -g @robmcelhinney/qr-file-share@latest
qr-file-share --help
```
