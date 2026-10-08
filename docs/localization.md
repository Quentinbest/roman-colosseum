# Localization

The application supports `en`, `zh-Hans`, `zh-Hant`, `ja`, and `es`. All catalogs are bundled into the hosted site and standalone HTML; translations never require a network request.

## Language and terminology policy

- Explicit saved choices take priority over the first supported browser preference, then English. Invalid preferences are ignored. Bare `zh` resolves to `zh-Hans`; explicit `Hans`/`Hant` overrides the region. `CN`/`SG` use Simplified Chinese and `TW`/`HK`/`MO` use Traditional Chinese.
- Traditional Chinese uses one shared catalog. Its current terminology includes `公尺`, `滑鼠`, `硬體` and `全螢幕`; suitability across Taiwan and Hong Kong still needs independent review. Spanish uses a broadly understandable shared edition, avoiding region-specific address forms. These are implementation assumptions for the initial five-language scope.
- Preserve `Monument Atlas`, `Amphitheatrum Flavium`, `Parco archeologico del Colosseo`, and `Il Colosseo si racconta`. Reference URLs, coordinates, viewpoint/era identifiers, keyboard bindings, and decorative symbols do not change.
- Preserve the distinction between archaeological evidence and interpretation. The ancient form is plausible, approximate, and not assigned to a precise historical date.

| English | 简体中文 | 繁體中文 | 日本語 | Español |
| --- | --- | --- | --- | --- |
| Colosseum | 罗马斗兽场 | 羅馬競技場 | コロッセオ | Coliseo |
| cavea | 看台 | 看臺 | 観客席 | graderío |
| hypogeum | 地下结构 | 地下結構 | 地下構造 | hipogeo |
| travertine | 石灰华 | 石灰華 | トラバーチン | travertino |
| arena | 竞技场 | 競技場 | アリーナ | arena |
| arcade | 拱廊 | 拱廊 | アーケード | arquería |
| interpretive reconstruction | 解释性复原 | 詮釋性復原 | 解釈に基づく復元 | reconstrucción interpretativa |

## Inventory and maintenance

`src/locales/en.json` is the source inventory, with 161 entries per locale. Semantic groups cover metadata, static interface/accessibility text, viewpoint navigation, both eras' viewpoint and feature descriptions, About/Help, loading/errors, and notifications. Geometry and camera data stay outside catalogs.

Use complete sentences with named `{{placeholders}}`. Do not embed HTML or derive grammar by changing a translated title's case. Icons, keycaps, and source links remain DOM elements. Values are applied with `textContent` or text attributes. Keep English fallback text in `index.html` synchronized with the catalog.

Run `npm run check:i18n` after editing every catalog; it checks raw resources so English fallback cannot hide incomplete translations. Run `npm test` for behavioral, layout, offline, and persistence checks. New user-facing strings must be cataloged; preserved names and technical literals belong in the checker's explicit allowlist.

Measurements use `Intl.NumberFormat` with the selected catalog locale; geometry remains in metres. The inauguration year is translated as a historical expression. Storage failure leaves language selection functional in memory. Persistence for directly opened `file:` documents depends on the browser.

## Review and release

Translations have an implementation terminology pass and an assistant editorial review. On 2026-10-09, the user approved PR #1 and authorized proceeding with merge and deployment. Independent fluent approvals have not been recorded; the user will arrange them as follow-up. Review both eras in context, including accessible names, historical qualifications, and error recovery. Traditional Chinese is authored separately, not accepted on the basis of automatic script conversion.

Publish the hosted and standalone builds together after approval, retaining the previous build. For a locale-specific defect, remove it from the supported list and selector together, then rebuild; stale saved preferences will fall back safely. For functional regressions, restore the prior complete build. No data migration is required.
