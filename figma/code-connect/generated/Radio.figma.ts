// url=https://www.figma.com/design/1xmAVpNG0xrBD9LqsOYWSk/Gravity-UI-MCP-Fun?node-id=53131%3A43373
// source=src/components/Radio/Radio.tsx
// component=Radio
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'M': 'm', 'L': 'l', 'XL': 'xl'});
const state = instance.getEnum('State', {'Default': 'Default', 'Hover': 'Hover', 'Disabled': 'Disabled'});
const checked = instance.getEnum('Checked', {'On': true, 'Off': false});
const contentVisible = instance.getBoolean('Content');
const contentText = instance.getString('↳ Content text') || 'Radio';
const value = 'value';

export default {
    id: 'radio',
    imports: ["import {Radio} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Radio
    value=${value}
    size=${size}
    checked=${checked}
    disabled=${state === 'Disabled'}
    content=${contentVisible ? contentText : undefined}
/>`,
    metadata: {nestable: true},
};
