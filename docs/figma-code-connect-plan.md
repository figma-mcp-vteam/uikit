# Figma Code Connect Automation Plan

## Summary

Implement Code Connect as a generated tooling layer, not as manually maintained
`.figma.tsx` files copied from the fork.

- First increment: pilot on `Button`, `Checkbox`, `Radio`, `Switch`, `Label`,
  `TextInput`, and `Select`.
- Figma node id source: use `simareeno/uikit` as seed data, then verify against
  live Figma metadata before publishing.
- Format: generated template files, `.figma.ts`.
- Pull request CI: check generated files only.
- Publishing: manual GitHub Actions workflow using `FIGMA_ACCESS_TOKEN`.

## Key Changes

- Add `@figma/code-connect` to `devDependencies`.
- Add `figma.config.json` with:
  - `include: ["figma/code-connect/generated/**/*.figma.ts"]`
  - `label: "React"`
  - `language: "tsx"`
  - `defaultBranch: "main"`
- Keep Code Connect tooling outside `src/`, so normal library typechecking and
  package output stay isolated:
  - `figma/code-connect/registry.json` - source of truth for mappings.
  - `figma/code-connect/generated/*.figma.ts` - generated templates, committed.
  - `tools/code-connect/*.mjs` - generator, check, sync, and publish helpers.
  - `tsconfig.figma.json` - dedicated typecheck config with
    `@figma/code-connect/figma-types`.

## Registry And Generator

Registry schema v1:

- `version`
- `figmaFileKey`
- `components[]`
- Each component contains `id`, `name`, `nodeId`, `source`,
  `importStatement`, `figmaProperties`, `inputs`, optional `derived`, and
  `example`.
- `figmaProperties` stores a live Figma `componentPropertyDefinitions` snapshot,
  including full property keys and `variantOptions`.

Generator behavior:

- Generate deterministic `.figma.ts` files from the registry.
- Use public snippets such as `import {Button} from "@gravity-ui/uikit"`.
- Validate emitted code props against local component props using existing
  `react-docgen-typescript`.
- Fail on duplicate component ids, duplicate generated filenames, unknown code
  props, missing enum mappings, stale generated output, or unsupported duplicate
  Figma display names.

## Initial Pilot Mappings

General rule: map only real UIKit props. Omit visual-only Figma states and any
Figma property that has no safe code equivalent.

- `Button`: map `View -> view`, `Size -> size`, `Content -> children`,
  `State=Disabled/Loading/Selected -> disabled/loading/selected`; omit `Hover`,
  `Icon only`, and instance swaps in v1.
- `Checkbox`, `Radio`, `Switch`: map `Size`, checked/selected state, disabled
  state, and text content to `children` or `content`.
- `Label`: map `Size`, `Theme`, key/value text, and supported type behavior;
  omit hover-only and unsupported icon swaps in v1.
- `TextInput`, `Select`: map `Size`, `View`, label/content text, clear button,
  disabled state, and error state only where real props exist.

## Scripts

- `code-connect:generate`: write generated templates.
- `code-connect:check`: verify registry, generated templates, and
  `tsconfig.figma.json`.
- `code-connect:sync`: tokened Figma REST check against live node metadata.
- `code-connect:publish`: run check and sync, then
  `figma connect publish --config figma.config.json`.

## CI And Publish

- Extend existing `CI / Verify Files` with `npm run code-connect:check`.
- Do not require a Figma token for PR checks.
- Add a `Code Connect Publish` workflow:
  - `workflow_dispatch` only.
  - Runs on `main`.
  - Uses secret `FIGMA_ACCESS_TOKEN`.
  - Runs `npm ci`, `npm run code-connect:sync`, and
    `npm run code-connect:publish`.
- Do not add scheduled drift checks in v1.
- Do not publish automatically on PR or normal push.

## Test Plan

- Unit-test generator helpers:
  - URL parsing and node id normalization.
  - Registry validation failures, including unknown code props and non-exhaustive
    enum mappings.
  - Enum exhaustiveness checks.
  - Deterministic generated output.
- Treat committed generated `.figma.ts` output as snapshots via
  `code-connect:generate --check`.
- Run:
  - `npm run code-connect:check`
  - `npm run typecheck`
  - `npm run lint:js`
- Manual publish acceptance:
  - Workflow publishes pilot components successfully.
  - Inspecting pilot nodes in Figma Dev Mode shows UIKit snippets with
    `@gravity-ui/uikit` imports.
  - Generated snippets do not contain fork-only props such as `state`,
    `content`, or `iconOnly` unless those props exist in UIKit.

## Assumptions

- The fork Figma file `1xmAVpNG0xrBD9LqsOYWSk` is acceptable as seed data, but
  not authoritative until live sync passes.
- `FIGMA_ACCESS_TOKEN` will have Code Connect write and file content read
  scopes.
- No public UIKit runtime API changes are introduced.
- No generated Code Connect files are included in npm package output.

## References

- <https://developers.figma.com/docs/code-connect/quickstart-guide/>
- <https://developers.figma.com/docs/code-connect/template-files/>
- <https://developers.figma.com/docs/code-connect/api/config-file/>
- <https://developers.figma.com/docs/rest-api/file-endpoints/>
