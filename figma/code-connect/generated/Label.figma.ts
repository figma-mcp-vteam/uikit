// url=https://www.figma.com/design/1xmAVpNG0xrBD9LqsOYWSk/Gravity-UI-MCP-Fun?node-id=53380%3A170630
// source=src/components/Label/Label.tsx
// component=Label
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'XS': 'xs', 'S': 's', 'M': 'm'});
const theme = instance.getEnum('Theme', {'Normal': 'normal', 'Info': 'info', 'Success': 'success', 'Warning': 'warning', 'Danger': 'danger', 'Unknown': 'unknown', 'Utility': 'utility', 'Clear': 'clear'});
const valueVisible = instance.getBoolean('Value');
const children = instance.getString('Key text') || 'Label';
const valueText = instance.getString('↳ Value text') || 'Value';

export default {
    id: 'label',
    imports: ["import {Label} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Label
    size=${size}
    theme=${theme}
    value=${valueVisible ? valueText : undefined}
>
    ${children}
</Label>`,
    metadata: {nestable: true},
};
