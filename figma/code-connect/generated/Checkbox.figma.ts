// url=https://www.figma.com/design/1xmAVpNG0xrBD9LqsOYWSk/Gravity-UI-MCP-Fun?node-id=53103%3A9376
// source=src/components/Checkbox/Checkbox.tsx
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
<Checkbox
    size=${size}
    checked=${checked}
    indeterminate=${indeterminate}
    disabled=${state === 'Disabled'}
    content=${contentVisible ? contentText : undefined}
/>`,
    metadata: {nestable: true},
};
