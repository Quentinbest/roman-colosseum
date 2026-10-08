# Multilingual implementation verification

Date: 2026-10-08. Runtime: Node 24.16.0, Google Chrome via Playwright 1.58.2, macOS.

## Scope and baseline

The implementation follows `docs/multilingual-implementation-plan.md` from the original workspace. That source plan remains unchanged and was not previously tracked. The saved pre-implementation working tree matches GitHub `main` at `82f39e91c7fc43091c75cc92253251fb92dd365a` byte for byte for every tracked remote file. The PR uses that remote baseline, preserving the local Git history and all pre-existing artifacts.

## Work items and evidence

| ID | Deliverable | Evidence | Status |
| --- | --- | --- | --- |
| ML-1 | Inventory, glossary, regional choices | 161 entries per catalog; `docs/localization.md`; explicit preserved-name/identifier allowlist | Complete |
| ML-2 | Bundled i18next foundation, resolution, storage, fallback | `src/i18n.js`; raw catalog checker; Node tests for matching, fallback, denied storage and stale choices after locale removal | Complete |
| ML-3 | Complete UI/state integration | HTML bindings, early loading/error localization, notification keys, open feature tracking, cached measurements; browser state comparisons across five locales and both eras | Complete |
| ML-4 | Four translated catalogs and responsive presentation | Individually authored catalogs; system CJK font stacks; screenshots at 320/390 px; breakpoint, pseudolocalization and 200% zoom checks | Complete |
| ML-5 | Regression coverage, packaging, contributor guidance and CI | Node and browser suites; HTTP subpath/persistence; offline direct-file tests; locked dependencies and PR verification workflow | Local verification complete; Linux browser CI blocked as detailed below |
| ML-R1 | Independent linguistic release approval | In-context review of all four target languages, especially historical qualifications | Blocked on independent fluent reviewers; draft PR only |

## Checks

Use `export PATH=/opt/homebrew/opt/node@24/bin:$PATH` in the original local environment, whose default `node` is Node 18. CI selects Node 24 explicitly.

- `npm run check`: passed, exit 0; syntax checks all JavaScript modules, scripts and tests.
- `npm ci --no-audit --no-fund`: passed, exit 0, in an isolated worktree without the original workspace's dependency symlinks.
- `npm run check:i18n`: passed, exit 0; five catalogs × 161 entries, placeholder parity, missing/empty/untranslated text, no catalog HTML, required dynamic families, source keys and English fallback HTML.
- `npm run test:i18n`: passed, exit 0; six Node tests, including deliberate missing translation/source cases and removal of a supported locale.
- `npm run build`: passed, exit 0; Vite site and standalone HTML. The pre-existing large-chunk advisory remains.
- `node scripts/test.mjs --localization-only`: passed, exit 0; 179 browser assertions after layout and hotspot fixes.
- `npm test`: final combined run passed, exit 0; all six unit tests and all 240 browser assertions (24 original UI + 5 ruins routes + 32 reconstruction + 179 localization). Earlier failures and corrective evidence are preserved below.
- `git diff --check`: passed, exit 0. No unrelated geometry or historical artifact edits are included.
- `TEST_DEVICE_SCALE_FACTOR=0.5 node scripts/test.mjs --localization-only`: passed locally, exit 0; all 179 localization assertions at the rasterization scale used by the final Linux attempt.
- GitHub Actions Linux browser verification: unresolved. The first two runs failed with a 30-second timeout on the initial zoom click. The third reached 21/24 original UI checks and 3/5 ruins route checks, then was cancelled after approximately 27 minutes without completing reconstruction or localization. This is not a passing CI result.

Browser coverage includes all five languages, both eras, four viewpoints, all feature cards, camera/geometry identity, lighting/orbit/label settings, held-input clearing, walking, fullscreen, About/Help, notification retranslation without extending expiry, blocked walking, loading and initialization failures, actual WebGL context loss, fullscreen failures, denied storage, HTTP reloads, invalid preferences, ordered browser languages, and offline direct-file selection. Existing geometry and navigation suites remain pinned to English.

Layout checks cover 320, 390, 391, 800, 801, 1100, 1101, and 1500 px; walking at 320/390 px; doubled pseudolocalized text; and 200% CSS zoom. Screenshots were inspected for CJK glyphs and the corrected layouts. This is Chromium coverage, not a Safari/Firefox certification or independent linguistic sign-off. Test output lives under ignored `test-results/`, leaving historical `artifacts/` intact.

## Recovery and gap audit

1. Initial build failed under Node 18 (`CustomEvent is not defined`); selecting the already-installed Node 24 resolved it.
2. The first focused browser run passed 176/178 checks. Expanded text overflowed the 320 px control grid, and lighting overlapped the era switch at 200% zoom. Viewer container queries and wrapping fixed both; the next run passed 178/178.
3. Review found that generating the resources map from supported-locale array positions would misassign catalogs if a locale were disabled. Explicit resource keys and a removal regression test fixed this gap.
4. Existing local dependency symlinks initially produced machine-specific lock entries. Regenerating the lockfile from `package.json` in a clean temporary directory removed them.
5. The original ancient orbit check exposed tall invisible hit areas created by wrapping collapsed hotspot labels. A diagnostic compared both builds: the baseline completed 513.35°, while the new build stopped at 194.4° after its cavea hotspot intercepted subsequent drags. Constraining collapsed label height restored 513.35° with every drag targeting the canvas. A focused assertion now guards the collapsed hit area. The original orbit assertion was retained unchanged.
6. A later combined run passed 238/240 checks but exposed automation latency in two timing-sensitive tests. The ancient stair test overshot a narrow landing while waiting for a keyboard-release round trip; its existing target predicate now releases the key in the same browser frame. The notification check could spend its 3.8-second lifetime waiting for automation; its language-change and expiry observations now run on page timers. Route conditions, collision assertions, notification text, and original expiry expectations remain unchanged. The regression and localization groups use separate browser sessions after a detail-close timeout that did not reproduce in a fresh-browser run.
7. The first timing-helper revision passed a function expression as a string without invoking it, causing five route failures (235/240 passed). Invoking the predicate corrected the test code. An isolated check using the actual helper and actual walking moved from `x=88.2` to `x=84.92064`, reached `x<85`, and stayed at precisely that position after 500 ms. The subsequent full run is the authoritative result in the checks section.
8. The first Linux PR workflow passed catalog/unit/build checks but timed out during its first zoom click in Chromium's separate headless shell. CI now selects the full `chromium` channel (new headless mode), matching the browser mode used by local Google Chrome, and installs it with `--no-shell`. See [Playwright's browser-mode documentation](https://playwright.dev/docs/browsers#chromium-new-headless-mode). [First failed run](https://github.com/Quentinbest/roman-colosseum/actions/runs/37786476831).
9. Full Chromium also timed out on the first zoom click on Linux. CI now sets `TEST_DEVICE_SCALE_FACTOR=0.5` to reduce software rasterization pixel work, retaining all CSS viewport sizes, geometry, interactions and assertions. The original local 240-check pass used native scale. Browser checks log the renderer and pixel ratio to distinguish rendering-environment limitations from application failures.
10. The [second failed run](https://github.com/Quentinbest/roman-colosseum/actions/runs/37788431162) and [third, cancelled run](https://github.com/Quentinbest/roman-colosseum/actions/runs/37789316847) did not close the CI gap. The third logged `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)` at device pixel ratio 0.5. It took approximately 11 minutes to report 21/24 UI checks and another two minutes to report 3/5 route checks. Reconstruction had not completed when the run was cancelled after approximately 27 minutes. These observations suggest a rendering/performance limitation in the hosted Linux environment; they do not establish the cause of each failed assertion. Local native-scale verification passed 240/240 checks, and the local half-scale localization run passed 179/179. Further CI work needs a suitable WebGL verification environment or additional investigation of the hosted runner. A GPU-capable or self-hosted runner has not been provisioned.

Three gap-closure passes covered (1) responsive layout, (2) safe locale removal and portable dependencies, and (3) the hotspot interaction regression. Local regression evidence is recorded above. Linux browser CI and independent language review remain outstanding. The final documentation-only evidence commit skips CI to avoid repeating the unchanged, already recorded failure; no successful CI result is claimed.

## Bundle growth

| Output | Baseline bytes | Final bytes | Change |
| --- | ---: | ---: | ---: |
| Standalone HTML | 641,225 | 738,344 | +97,119 (+15.1%) |
| JavaScript | 610,744 | 698,199 | +87,455 (+14.3%) |
| JavaScript gzip (same compressor) | 156,338 | 185,723 | +29,385 (+18.8%) |
| CSS | 17,873 | 23,334 | +5,461 (+30.6%) |

All five catalogs are embedded in both outputs. Optional Google Fonts remain the only remote presentation dependency and are not needed by offline CJK fallback fonts. Bundling follows [i18next's bundled resource configuration](https://www.i18next.com/overview/configuration-options) and [Vite's JSON import support](https://vite.dev/guide/features#json).

## Remaining release requirements

The initial policy uses a shared Traditional Chinese edition, shared Spanish edition, browser-language matching, and preserved brand/Latin/source names. These are documented implementation assumptions from the supplied plan. Linux browser verification must be resolved, and a fluent reviewer for each target language must approve the in-context historical terminology and qualifications before production release. The PR remains a draft. No deployment or merge is part of this task. File-URL persistence remains browser-dependent.
