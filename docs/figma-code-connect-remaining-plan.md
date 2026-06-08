# Остаток работ по Code Connect PoC

## Summary

GitHub-часть PoC уже поднята в sandbox fork `figma-mcp-vteam/uikit`.
PR зеленый и готов к merge:

- <https://github.com/figma-mcp-vteam/uikit/pull/1>
- planning doc из PR удален;
- registry пока смотрит на seed file `Gravity-UI-MCP-Fun`, а не на `HALF YC Gravity UI`;
- `FIGMA_ACCESS_TOKEN` в repo secrets пока не добавлен;
- проверка страницы Button в `HALF YC Gravity UI` вернула `No published components found in this selection`.

Цель следующего этапа: подключить PoC к реальному Figma-файлу `HALF YC Gravity UI`
и проверить полный цикл `generate -> check -> sync -> dry-run publish -> publish`.

## Что осталось сделать

1. Смёржить PR #1 в `main` fork `figma-mcp-vteam/uikit`.

2. Подготовить `HALF YC Gravity UI`:

   - опубликовать pilot components как Figma library components;
   - для `Button`, `Checkbox`, `Radio`, `Switch`, `Label`, `TextInput`, `Select`
     взять ссылки через `Copy link to selection` именно с root component set;
   - не использовать page/frame node ids в registry.

3. Подготовить Figma token:

   - создать Figma PAT со scopes `File content: Read` и `Code Connect: Write`;
   - добавить secret в fork:

     ```bash
     gh secret set FIGMA_ACCESS_TOKEN --repo figma-mcp-vteam/uikit
     ```

4. Перенастроить registry:

   - заменить `figmaFileKey` на `GihZUtevc7oCwpDQrcdR4i`;
   - заменить `figmaFileName` на `HALF-YC-Gravity-UI`;
   - заменить node ids pilot components на реальные component set ids;
   - обновить `figmaProperties` из live Figma metadata;
   - оставить маппинг только на реальные UIKit props.

5. Обновить generated templates:

   ```bash
   npm run code-connect:generate
   npm run code-connect:check
   ```

6. Проверить tokened Figma flow:

   ```bash
   npm run code-connect:sync
   npm run code-connect:publish:dry-run
   ```

7. После merge в `main` fork запустить manual workflow `Code Connect Publish`.

## Acceptance

- `figma connect parse` читает все generated templates.
- `code-connect:sync` подтверждает, что registry совпадает с live Figma metadata.
- `code-connect:publish:dry-run` проходит без ошибок.
- Manual workflow `Code Connect Publish` проходит на `main`.
- В Figma Dev Mode pilot components показывают snippets с imports из `@gravity-ui/uikit`.

## Блокеры и риски

- Если `HALF YC Gravity UI` components не published, Code Connect не увидит их.
- Если выбран frame/page/instance вместо root component set, registry будет некорректным.
- Если token не имеет `File content: Read` и `Code Connect: Write`, `sync` или `publish` упадут.
- Если registry retarget сделать до публикации компонентов, checks без Figma token могут проходить,
  но publish flow останется непроверенным.
