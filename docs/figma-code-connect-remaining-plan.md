# Остаток работ по Code Connect PoC для YC Gravity UI Code Connect test

## Summary

GitHub-часть PoC поднята и смёржена в sandbox fork `figma-mcp-vteam/uikit`.
Локальный registry теперь смотрит на рабочий Figma-файл `YC Gravity UI – Code connect test`:

- file key: `5vAAQi3Iwj9tACtMsduGos`;
- file name: `YC Gravity UI – Code connect test`;
- source repository: `https://github.com/figma-mcp-vteam/uikit`;
- source branch: `main`;
- pilot components: `Checkbox`, `Hotkey`, `Avatar`, `User`, `Card`, `Label`;
- подтвержденные root component set ids:
  - `Checkbox` -> `48571:15566`;
  - `Hotkey` -> `77863:7673`;
  - `Avatar` -> `41226:428847`;
  - `User` -> `51015:45880`;
  - `Card` -> `44798:511299`;
  - `Label` -> `77305:21930`.

Pilot Code Connect templates для этих 6 компонентов локально проверены и опубликованы
в рабочий Figma-файл 2026-06-08 через `npm run code-connect:publish`.
После переноса файла registry ретаргетнут на `YC Gravity UI – Code connect test`; старые root ids
проверены в новом file key через Code Connect context. Tokened `publish:dry-run` и `publish`
для нового файла прошли успешно.
Generated templates используют официальный Template API `figma.helpers.react.renderProp` /
`figma.helpers.react.renderChildren`, без самописного JSX formatter.
Generated `// source=` публикуется как полный GitHub blob URL, чтобы Figma могла открыть
конкретный файл в `figma-mcp-vteam/uikit`, а registry при этом хранит локальный source path
для проверки props. После повторной публикации Figma MCP `get_code_connect_map` для `Checkbox`
возвращает `source=https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Checkbox/Checkbox.tsx`.
Code Connect workflow использует официальный `@figma/code-connect` CLI `1.4.7`.
Проверки разделены на tokenless local gate и tokened Figma gate:
`code-connect:check` не требует токен, а `code-connect:sync`, `code-connect:preview`,
`code-connect:validate:figma`, `code-connect:publish:dry-run` и `code-connect:publish`
требуют `FIGMA_ACCESS_TOKEN`.
`npm run typecheck` включает tokenless `code-connect:check`, поэтому stale
`generated/*.figma.ts` падают на общем typecheck-gate, а не только отдельным CI-шагом.
PR workflow `.github/workflows/code-connect-sync.yml` остаётся tokened live Figma gate:
он запускает `code-connect:sync`, рендерит markdown через
`tools/code-connect/render-sync-comment.mjs` и публикует/удаляет sticky PR comment через
`marocchino/sticky-pull-request-comment@v3`. Drift не валит PR, но оставляет actionable
comment; infrastructure errors (`FIGMA_ACCESS_TOKEN`, Figma API, missing report/node) валят job.
`code-connect:preview` оставлен как отдельная post-publish/ad hoc диагностика: в CLI `1.4.7`
он может вернуть `No published Code Connect templates found for this node` до публикации
Code Connect docs, поэтому не входит в blocking pre-publish gate.

`Button`, `Radio`, `Switch`, `TextInput` и `Select` временно не входят в pilot registry: в рабочем Figma-файле
для них пока не подтверждены root component set node ids. Overview-страница содержит
instances/preview frames, но их нельзя использовать как registry node ids.

## Текущий статус на 2026-06-08

- Предыдущая ветка `feat/mcp-figma-poc` уже смёржена в `main` через PR
  `https://github.com/figma-mcp-vteam/uikit/pull/1`.
- Дальнейшая работа перенесена на ветку `feat/code-connect-pilot-on-published-library`,
  созданную от свежего `origin/main`.
- Рабочий Figma-файл `YC Gravity UI – Code connect test` опубликован как library;
  после этого Code Connect UI начал показывать CLI-created connection для `Checkbox`.
- Figma GitHub integration подключена к `figma-mcp-vteam/uikit`, директория UI-компонентов:
  `src/components`.
- `Open in GitHub` и tooltip в Figma теперь указывают на полный source URL вида
  `https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Checkbox/Checkbox.tsx`.
- Figma MCP подтвердил опубликованные mappings для pilot-компонентов:
  - `Checkbox`: `hasTemplate: true`, import из `@gravity-ui/uikit`, валидные JSX snippets
    для вариантов `size`, `checked`, `indeterminate`, `disabled`, `content`;
  - `Hotkey`: `hasTemplate: true`, import из `@gravity-ui/uikit`, snippets с `value`
    и `platform`;
  - `Avatar`: `hasTemplate: true`, import из `@gravity-ui/uikit`, snippets с `size`,
    `view`, `theme`, `text`.
- Локальная проверка `npm run code-connect:check` прошла полностью:
  - `node --test tools/code-connect/lib.test.mjs`: 29/29 tests passed;
  - deterministic generation check passed;
  - `tsc -p tsconfig.figma.json --noEmit` passed;
  - `figma connect parse --config figma.config.json --exit-on-unreadable-files` прочитал
    все 6 generated templates.
- `npm run typecheck` теперь выполняет обычный `tsc --noEmit`, а затем
  `npm run code-connect:check`; это делает freshness `registry.json -> generated/*.figma.ts`
  частью общего typecheck-gate.
- Hardening workflow добавляет `code-connect:preview` и `code-connect:validate:figma`:
  preview доступен для проверки published snippets, а validate выполняет
  `sync + publish --dry-run` перед реальным publish.
- `code-connect:sync` теперь должен показывать actionable drift details:
  missing/extra properties, type mismatch и variant option mismatch.
- `code-connect-sync.yml` больше не содержит inline GitHub API script для PR comments:
  sticky comment lifecycle вынесен в `marocchino/sticky-pull-request-comment@v3`, а формат
  комментария остаётся в локальном renderer-е `tools/code-connect/render-sync-comment.mjs`.
- Первый запуск `code-connect:check` внутри read-only sandbox падал на создании temp dir
  (`EPERM`), но тот же check прошёл вне sandbox; это ограничение среды, не ошибка PoC.
- Текущий PoC соответствует технической части гипотезы: AI/MCP получает реальные React
  компоненты, imports, props и snippets. До полной гипотезы ещё не хватает масштаба:
  большего покрытия, drift/sync report по всей библиотеке, инструкции для команд и
  измерения эффекта на 2-3 пилотах.

## Что осталось сделать

1. Подключить GitHub-публикацию, если нужен publish из workflow, а не только локально:

   - добавить secret в fork:

     ```bash
     gh secret set FIGMA_ACCESS_TOKEN --repo figma-mcp-vteam/uikit
     ```

   - запустить manual workflow `Code Connect Publish`.

2. Расширить registry после подтверждения root ids:

   - вернуть `Button`, `Radio`, `Switch`, `TextInput`, `Select`, когда для них будут реальные root component set ids из рабочего файла;
   - ссылки брать через `Copy link to selection` именно с root component set;
   - не использовать page/frame/instance node ids в registry;
   - обновить `figmaProperties` из live Figma metadata через Code Connect context;
   - оставить маппинг только на реальные UIKit props.

3. После каждого изменения registry обновлять generated templates:

   ```bash
   npm run code-connect:generate
   npm run code-connect:check
   ```

4. Перед следующей публикацией повторять tokened Figma validation:

   ```bash
   npm run code-connect:sync
   npm run code-connect:validate:figma
   npm run code-connect:publish:dry-run
   ```

5. Реальный publish запускать только после явного подтверждения:

   ```bash
   npm run code-connect:publish
   ```

## Acceptance

- Done: `figma connect parse` читает все generated templates.
- Done: `code-connect:check` проходит локально для всех pilot templates.
- Done: `npm run typecheck` включает `code-connect:check` и ловит stale generated templates.
- Done: `code-connect:sync` подтверждает, что registry совпадает с live Figma metadata.
- Done: PR sync workflow публикует drift/error через sticky PR comment action и удаляет
  комментарий при `ok`.
- Done: `code-connect:publish:dry-run` проходит без ошибок после добавления token.
- Done: локальный `code-connect:publish` успешно загружает pilot templates в новый Figma-файл.
- Done: Figma MCP `get_code_connect_map` для `Checkbox` возвращает `hasTemplate: true`, import
  `@gravity-ui/uikit` и валидный JSX snippet.
- Done: Figma MCP `get_code_connect_map` для `Hotkey` и `Avatar` возвращает `hasTemplate: true`,
  GitHub source URL и валидные snippets.
- Done: В Figma Dev Mode `Checkbox` показывает CLI-created connection с полным GitHub source URL.
- `code-connect:preview` используется как post-publish/ad hoc проверка snippets.
- `code-connect:validate:figma` проходит перед publish и включает `sync` и `publish --dry-run`.
- Manual workflow `Code Connect Publish` проходит на `main`, если нужен publish через GitHub.
- В Figma Dev Mode pilot components показывают snippets с imports из `@gravity-ui/uikit`.

## Блокеры и риски

- Если выбран frame/page/instance вместо root component set, registry будет некорректным.
- Если token не имеет `File content: Read` и `Code Connect: Write`, `sync` или `publish` упадут.
- Checks без Figma token могут проходить, но `sync` и publish flow не запустятся.

https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/YC-Gravity-UI-%E2%80%93-Code-connect-test?node-id=48654-31725&p=f&m=dev
