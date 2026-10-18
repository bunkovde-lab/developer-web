# v0.19 test build

Build with `GITHUB_SHA=$(git rev-parse HEAD) node scripts/build-site.cjs --out dist`, then serve `dist` over HTTP. The game is buildless HTML/CSS/JavaScript with external domain modules, not a single-file demo. `BUILD_MANIFEST.json` records the GitHub source SHA and SHA256 of every deployed file. `tests/build-package.cjs` validates all module paths, 266 SVG and every hash.

Pages integration retains stable root at 7ece96d, pins the integrated rc1 to c86df7d, and adds `/previews/v019/` only after this branch is reviewed and merged by Programm. It does not replace either prior build. Sites hosts an isolated user-test build before main integration; the site source commit is separate from the GitHub game commit and its manifest identifies the latter.

The build is a release candidate for user testing, not a stable release. Browser/device emulation is not physical Android verification. The private test URL is for the project owner; it is not an anonymous public QA link. An additional public Pages path becomes available after normal integration.
