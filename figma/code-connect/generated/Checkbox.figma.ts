// url=https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/YC%20Gravity%20UI%20%E2%80%93%20Code%20connect%20test?node-id=48571%3A15566
// source=https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Checkbox/Checkbox.tsx
// component=Checkbox
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'M': 'm', 'L': 'l', 'XL': 'xl'});
const state = instance.getEnum('State', {'Default': 'Default', 'Hover': 'Hover', 'Disabled': 'Disabled'});
const checked = instance.getEnum('Checked', {'Off': false, 'On': true});
const indeterminate = instance.getEnum('Indeterminate', {'On': true, 'Off': false});
const contentVisible = instance.getBoolean('Content');
const contentText = instance.getString('↳ Content text') || 'Checkbox';

export default {
    id: 'checkbox',
    imports: ["import {Checkbox} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Checkbox${figma.helpers.react.renderProp('size', size)}${figma.helpers.react.renderProp('checked', checked)}${figma.helpers.react.renderProp('indeterminate', indeterminate)}${figma.helpers.react.renderProp('disabled', state === 'Disabled')}${figma.helpers.react.renderProp('content', contentVisible ? contentText : undefined)} />`,
    metadata: {nestable: true},
};
