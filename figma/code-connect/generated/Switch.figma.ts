// url=https://www.figma.com/design/1xmAVpNG0xrBD9LqsOYWSk/Gravity-UI-MCP-Fun?node-id=53131%3A64366
// source=src/components/Switch/Switch.tsx
// component=Switch
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'M': 'm', 'L': 'l'});
const checked = instance.getEnum('Selected', {'False': false, 'True': true});
const disabled = instance.getEnum('Disabled', {'False': false, 'True': true});
const contentVisible = instance.getBoolean('Content');
const contentText = instance.getString('Content text') || 'Switch';

export default {
    id: 'switch',
    imports: ["import {Switch} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Switch
    size=${size}
    checked=${checked}
    disabled=${disabled}
    content=${contentVisible ? contentText : undefined}
/>`,
    metadata: {nestable: true},
};
