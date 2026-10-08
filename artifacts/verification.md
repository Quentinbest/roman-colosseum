# Verification — 2026-10-08

The project passed **61 browser checks**: 24 original acceptance checks, 5 ruins-route checks, and 32 reconstruction checks. See [acceptance-results.json](acceptance-results.json) for the individual results.

`npm run check`, `npm run build`, syntax checks for the browser test files, and `git diff --check` passed. Vite gives a non-blocking bundle-size advisory. The JavaScript bundle, including Three.js, is approximately 159 kB gzipped.

The browser suites ran through the connected Playwright browser against the production standalone HTML, loaded into an in-memory document. The sandbox blocks local listening sockets, so no local preview server was used. The repository's `npm test` command runs the same three suites with a local Chrome installation.

Delivered standalone file: `dist/colosseum.html`.

SHA-256: `ab917d08b55e77ecdab57c72ed2caceed994539f9921568afda0cf989219b8fd`.

## Functional acceptance

- Both forms completed an exterior mouse orbit of more than 360°.
- Switching in both directions preserved clear exterior and interior camera positions, focus targets and orientation.
- Exactly one form was visible at a time. The ancient exterior contains 80 bays; the ruins retain 39 complete exterior bays.
- The restored arena floor, seating and passages had clear orbit viewpoints.
- Both forms supported continuous passage-to-arena travel and the return journey.
- Both forms supported the arena side stair and descent. The ancient stair also connected to its lower seating promenade.
- Walking along the ancient promenade reached a representative vaulted access bay and returned without a trap.
- Switching from the ancient arena over a missing portion of the ruined floor moved the walker to the surviving center walkway.
- Switching from a ruined seating position obstructed by restored seating moved the walker to a supported ancient promenade position.
- These walking relocations preserved viewing direction.
- Switching during a viewpoint transition canceled stale camera movement and restored canvas opacity.
- Zoom, annotations, lighting, reset, Escape, and the retained ruins controls passed.
- Form switching worked in fullscreen and at a 390 × 844 mobile viewport. Mobile layout had no horizontal overflow, and its movement pad worked.
- Both geometry audits found no non-finite vertex positions or missing normals/UVs. Rendered surfaces use two-sided materials.
- No browser runtime errors were recorded.

## Visual acceptance

The present-day model was compared with exterior and interior photographs. The ancient model was compared with the cutaway reconstruction from the *Il Colosseo si racconta* exhibition. The source links and the evidence/interpretation table are in [README.md](../README.md).

The comparison covered the elliptical footprint, height and arcade rhythm; the ruined outer wall and exposed underground structure; the restored arena floor, seating bowl, circulation terraces, access openings, attic and upper colonnade. The present-day version retains its distinctive silhouette, brick buttresses, fragmented seating, and visitor walkways.

Exterior orbit screenshots, arena and seating views, passages, the side stair, its landing, and the representative access bay were inspected. Closed geometry supplies wall ends, floors and undersides. Stair-opening and landing conflicts found during testing were corrected, including the arena-wall opening and the clearance beside adjoining seats. The complete route was then tested again.

**Visual decision: accepted as an approximate, stylized architectural reconstruction.** The ancient form is plausible at the requested level of detail and does not claim a precise historical date. Material colors, seat counts, profiles, circulation details and mast dimensions remain interpretive. The shallow access bays have closed ends; the deeper rooms they suggest are not included.

These checks cover the included representative routes and selected viewpoints. They do not constitute a survey of every possible camera position or historical space. Mobile checks used a browser viewport, not physical phone hardware.

## Review images

- Present-day: [exterior](exterior.png), [arena](arena.png), [seating](seating.png), [passage](passages.png).
- Ancient: [exterior](ancient-exterior.png), [arena](ancient-arena.png), [seating](ancient-seating.png), [passage](ancient-passages.png).
- Ancient routes: [covered passage](ancient-walking-passage.png), [seating viewpoint](ancient-walking-cavea.png), [stair](ancient-stair.png), [landing connection](ancient-stair-connection.png), [access bay](ancient-access-bay.png).
- [Ancient mobile view](ancient-mobile.png) and [golden-hour view](ancient-golden-hour.png).
- Comparison references: [present-day exterior](reference-exterior.png), [present-day interior](reference-interior.png), [exhibition model](reference-ancient.png).

## 中文记录

项目通过 **61 项浏览器检查**：原有功能 24 项、遗迹路线 5 项、古代复原与切换 32 项。`npm run check`、`npm run build`、测试脚本语法检查和 `git diff --check` 均通过。Vite 的构建体积提示不影响构建成功。

测试通过连接的 Playwright 浏览器运行，加载实际生产版独立 HTML，不依赖本地服务器。上方提供交付文件路径与 SHA-256 校验值。

两种形态均完成超过一整圈的外部环绕，以及竞技场、看台和通道探索。已验证双向切换、视点保留、地面消失或新几何体阻挡时的安全移位、视点过渡中切换、全屏和移动端操作。古代路线还覆盖了阶梯、看台环形平台和一个带拱顶的入口空间，并验证返回路线。检查中发现的阶梯开口、平台及竞技场围墙冲突均已修正后重测。

已对照现状照片和展览复原模型完成视觉复核，接受本成果作为采用近似尺寸的风格化建筑复原。古代形态不对应某个精确历史年份。座席数量、材质颜色、装饰轮廓、路线和桅杆尺寸等属于解释性设计；浅入口空间以实体端墙结束，后方房间不在模型范围内。

检查覆盖已包含的代表性路线和所选视点，不代表验证了每个可能的相机位置。移动端采用浏览器视口测试，未使用实体手机。
