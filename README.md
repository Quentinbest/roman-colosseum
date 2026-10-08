# Monument Atlas — The Colosseum

An interactive study of the Roman Colosseum in two forms: the present-day ruins and a plausible ancient reconstruction. Built with JavaScript, Three.js, and Canvas-generated masonry, marble, and sand textures. The ancient form does not represent one precise historical date.

Open `dist/colosseum.html` directly for the standalone experience, or run the development server:

```sh
npm install
npm run dev
```

```sh
npm run check   # JavaScript syntax checks
npm run check:i18n # Catalog coverage and English HTML parity
npm run test:i18n  # Locale resolution, fallback and storage tests
npm run build   # Production site and standalone HTML
npm test        # Build and run browser acceptance checks; requires Google Chrome
```

The production site is in `dist/`. The standalone HTML embeds the application, Three.js, and CSS; Google Fonts are optional and fall back to installed fonts when offline. No model downloads or texture services are required.

Use Node.js 22.12+ (Node 24 is used in CI) and `npm ci` for a reproducible installation. The interface, historical descriptions, help, and error messages support English, Simplified Chinese, Traditional Chinese, Japanese, and Spanish. Choose a language inside the viewer, including in fullscreen. Your choice takes priority over browser language preferences and is saved when browser storage permits it. Changing language preserves the scene and exploration settings; all translations work offline in the standalone HTML. Direct-file preference persistence depends on the browser.

Translation keys, terminology, regional assumptions, review requirements, and maintenance instructions are in [docs/localization.md](docs/localization.md). Independent fluent review of the four target languages remains required before release.

## GitHub Pages deployment

The deployment target is [quentinbest.github.io/roman-colosseum/](https://quentinbest.github.io/roman-colosseum/). Enable **GitHub Actions** in **Settings → Pages → Build and deployment → Source**. GitHub Pages requires a public repository on GitHub Free, or a plan that supports Pages for private repositories.

The workflow in `.github/workflows/deploy.yml` checks JavaScript, validates catalogs, runs unit tests, and builds on Linux. A separate standard `macos-15` runner verifies all browser behavior with Chromium's Metal renderer at normal pixel density; Linux software rendering is too slow for the existing timed walking checks. Both jobs must pass before deployment. Pull requests run verification only. Pushes to `main` publish the verified `dist/`; **Run workflow** also supports deployment from `main`. The build uses relative asset paths so the site works below `/roman-colosseum/`. The standalone file remains available at `colosseum.html`.

Browser verification logs each assertion and saves completed suite results as it runs. CI retains the `verification-evidence` artifact for 14 days, including available screenshots and results after a failure. The browser step has a 15-minute limit. An interrupted run is not a pass; check the workflow conclusion and the `completed` field in `acceptance-results.json`. Renderer and device pixel ratio are logged for diagnosing differences from local Chrome.

Deployment guidance: [GitHub Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) and [Vite relative base paths](https://vite.dev/guide/build.html#relative-base).

部署目标为 [quentinbest.github.io/roman-colosseum/](https://quentinbest.github.io/roman-colosseum/)。在 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。GitHub Free 要求仓库为公开状态；私有仓库需要支持 Pages 的套餐。工作流在 Linux 上运行语法、翻译资源、单元检查及构建，另用标准 `macos-15` 运行器和 Chromium Metal 渲染器，以正常像素密度验证全部浏览器行为。Linux 软件渲染无法满足现有定时步行检查的帧率需求。部署必须等待两个任务都通过；PR 仅运行验证。`main` 收到推送或在 Actions 页面从 `main` 手动运行时，验证通过后发布 `dist/`。相对资源路径适用于 `/roman-colosseum/` 子目录，独立 HTML 文件仍保留。CI 验证产物保留 14 天，浏览器步骤限时 15 分钟；超时或未完成的运行不视为通过。

## Explore

- Drag to orbit, scroll/pinch to zoom, right-drag/two-finger drag to pan.
- Select the exterior, arena, cavea, or passage viewpoints.
- Select **Present-day ruins** or **Ancient reconstruction** to change form with one click. The switch also works on foot, on mobile, and in fullscreen.
- The forms share their origin, orientation, scale, and arena elevation. Switching retains a clear viewpoint. If geometry blocks the camera or its floor disappears, the camera moves to a clear position. On foot, it keeps the viewing direction and finds a supported route.
- Choose **Explore on foot**. Drag to look, use **WASD** or the on-screen arrows to move, and hold **Shift** for faster movement.
- Press **R** to recover the current starting point. **Escape** returns to the exterior overview.
- Walk along the axial entrance ramp to the arena platform. The boardwalk crosses the exposed hypogeum; a side stair leads to a lower cavea lookout.
- In the ancient form, walk through the covered axial passage to the sand-covered arena. The stair beside the entrance leads to the lower seating promenade. Drag to turn and follow the promenade around the seating bowl. The small access bays end at closed walls; deeper chambers are outside the model.
- Toggle architectural annotations, auto orbit, daylight/golden-hour lighting, or fullscreen.

## Scope and references

The approximate footprint is 189 × 156 m, with a surviving outer wall around 48 m high. The model includes partial outer arcades, rectangular attic windows, columns and cornices, masonry buttresses, exposed inner rings, damaged structural terraces, a small preserved seating section, simplified hypogeum walls, and connected visitor routes.

The ancient form restores the complete 80-bay enclosure, three arcaded storeys and attic, an enclosed arena, marble seating, radial aisles, two circulation terraces, representative vaulted access bays, a sheltered upper colonnade, and awning masts. It removes the modern buttresses, visitor boardwalk and exposed hypogeum from that form. The ruins remain the initial selection.

This is a procedural architectural interpretation, not a measured archaeological reconstruction. Rome's surrounding streets, statues, painted figures, every historical chamber, and inaccessible underground spaces are outside the study. Awning fabric is assumed stowed. The code does not combine these approximations into a claim about a specific year.

| Feature | Reference support | Interpretation in this model |
| --- | --- | --- |
| Outer enclosure | Surviving façade and the archaeological park's monument description | Missing bays repeat the surviving rhythm; column capitals and profiles are simplified. |
| Arena floor | The park describes underground machinery beneath the arena | A continuous sand-colored deck covers the whole arena. Floor thickness, sand color, and ramp levels are approximate. |
| Marble seating and passage finishes | The park's stucco restoration material describes marble seating and red-and-white passage plaster | Seat count, aisle spacing, red panel placement, texture and color values are chosen for legibility. |
| Seating levels, entrances and upper colonnade | The *Il Colosseo si racconta* exhibition model provides a visual reconstruction | Two promenades, ten shallow vaulted access bays, a simplified portico, and a small timber seating band. The exact layout is interpretive. |
| Awning apparatus | Exterior remains and published reconstruction imagery show support positions | Slender timber masts indicate the system. Their heights and spacing are approximate; no deployed fabric or rigging is reconstructed. |
| Ruins and modern routes | Present-day exterior and interior photographs | Seating remnants, repairs, underground partitions, visitor platforms and routes are simplified. |

- [Parco archeologico del Colosseo: The Colosseum](https://colosseo.it/en/area/the-colosseum/)
- [The underground levels](https://colosseo.it/en/marvels/the-underground-levels-of-the-colosseum/)
- [The southern ambulatories](https://colosseo.it/en/southern-ambulatories/)
- [Restoration photography and interior reference](https://www.wallpaper.com/architecture/colossal-cleanup-tods-completes-first-phase-of-renovation-of-romes-colosseum)
- [Exterior photograph, Steve Ross](https://www.flickr.com/photos/100861993@N06/53931936202)
- [Archaeological park: marble seating, colored plaster and stucco](https://colosseo.it/en/event/the-colosseums-stucco-decorations-live-restoration/)
- [Electa: Il Colosseo si racconta exhibition and cutaway reconstruction](https://www.electa.it/iniziative-speciali/il-colosseo-si-racconta/)
- [Museo della Civiltà Romana: model of Imperial Rome](https://www.museociviltaromana.it/en/node/4430) — comparative reconstruction context, not a date assigned to this model.

Historical screenshots and verification evidence are in `artifacts/`. New browser runs write screenshots and `acceptance-results.json` under the ignored `test-results/` directory, preserving historical evidence. The original suites exercise the standalone production build in an English in-memory document. Localization checks additionally use a temporary local HTTP server under `/roman-colosseum/` for persistence and hosted assets, plus a direct-file offline smoke test. Locally the runner uses Google Chrome; set `PLAYWRIGHT_CHROMIUM=1` to use Playwright's installed Chromium as CI does. After a build, `node scripts/test.mjs --localization-only` runs the focused browser suite.

## Implementation

`src/model.js` builds each form from the same dimensional framework. Geometry is closed at edges and undersides, then merged into spatial material batches. Canvas creates the textures at startup; no external model assets are needed. Only the selected form is visible and participates in walking collision checks.

`src/main.js` manages the form switch, viewpoint presets, lighting, labels, and interface. A switch cancels pending viewpoint transitions, selects the matching collision surfaces, and refreshes shadows. `src/navigation.js` checks floor support and camera clearance. Clear positions remain unchanged; blocked walking positions move to the closest validated representative route. Reset and the four viewpoints remain available for recovery.

`tests/acceptance.js` checks the original experience. `tests/routes.js` checks its connected paths. `tests/reconstruction.js` checks the ancient exterior orbit, interior views, continuous routes, camera recovery, switching in both directions, mobile controls, and fullscreen.

## 中文说明

这是包含现存遗迹与古代复原两种形态的罗马斗兽场交互模型，使用 JavaScript、Three.js 和 Canvas 程序纹理构建。古代形态依据参考资料进行合理复原，不代表某个精确历史年份。直接打开 `dist/colosseum.html` 即可浏览；开发、构建和验证命令见上文。

拖动鼠标环绕查看，滚轮缩放，右键拖动平移。选择 **Explore on foot** 后，拖动调整视线，使用 **WASD** 或屏幕方向按钮移动，按住 **Shift** 加速。**R** 重置当前位置，**Escape** 返回外部全景。通道坡道连接竞技场平台，中央步道跨越地下遗迹，侧面阶梯通往下层看台观景点。

模型采用近似尺寸与解释性路线，不属于考古测绘成果。已保留现存外墙、残缺看台和裸露地下结构等主要特征；并未重建全部房间、地下空间或周边城区。

点击 **Present-day ruins** 或 **Ancient reconstruction** 即可切换，步行、移动端和全屏模式也可使用。两种形态共用位置、方向、比例及竞技场标高。无遮挡的视点会保留；若新墙体挡住相机，或脚下地面消失，相机会移到安全位置。步行切换保留视线方向。

古代形态包含完整的 80 开间外墙、竞技场地面、大理石看台、放射状阶梯、两层环形步行平台、代表性拱顶入口和上层柱廊。可从带顶通道走入竞技场，再经入口旁阶梯到达下层看台平台。小型入口空间以实体端墙结束，不延伸至模型范围之外的房间。

考古公园资料支持大理石看台、通道中的红白灰泥装饰，以及地下机械设施上方的竞技场地面。展览复原模型用于比较看台、通道入口和柱廊。具体座席数量、路线、颜色、木质上层座席和遮阳篷桅杆尺寸属于解释性设计；篷布按收起状态处理。上表和链接区分了资料依据与本模型的取舍。

`src/model.js` 生成两种形态并合并几何体；`src/main.js` 管理切换、视点和界面；`src/navigation.js` 检查碰撞、地面支撑及相机净空。三份浏览器测试分别覆盖原有功能、遗迹路线，以及古代模型与切换行为。验收记录和截图位于 `artifacts/`。
