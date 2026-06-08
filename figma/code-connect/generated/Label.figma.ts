// url=https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/YC%20Gravity%20UI%20%E2%80%93%20Code%20connect%20test?node-id=77305%3A21930
// source=https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Label/Label.tsx
// component=Label
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'XS': 'xs', 'XXS': 'xxs', 'S': 's', 'M': 'm'});
const theme = instance.getEnum('Theme', {'Normal': 'normal', 'Info': 'info', 'Success': 'success', 'Warning': 'warning', 'Danger': 'danger', 'Unknown': 'unknown', 'Utility': 'utility', 'Clear': 'clear'});
const valueVisible = instance.getBoolean('Value');
const children = instance.getString('Key text') || 'Label';
const valueText = instance.getString('↳ Value text') || 'Value';

export default {
    id: 'label',
    imports: ["import {Label} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Label${figma.helpers.react.renderProp('size', size)}${figma.helpers.react.renderProp('theme', theme)}${figma.helpers.react.renderProp('value', valueVisible ? valueText : undefined)}>
    ${figma.helpers.react.renderChildren(children)}
</Label>`,
    metadata: {nestable: true},
};
