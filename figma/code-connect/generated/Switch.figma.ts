// url=https://www.figma.com/design/GihZUtevc7oCwpDQrcdR4i/YC-Gravity-UI-Code-connect-test?node-id=17215%3A9968
// source=src/components/Switch/Switch.tsx
// component=Switch
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'M': 'm', 'S': 's', 'L': 'l'});
const state = instance.getEnum('State', {'Default': 'Default', 'Hover': 'Hover', 'Disabled': 'Disabled', 'Loading': 'Loading'});
const checked = instance.getEnum('Selected', {'False': false, 'True': true});
const contentVisible = instance.getBoolean('Content');
const contentText = instance.getString('Content text') || 'Switch';

export default {
    id: 'switch',
    imports: ["import {Switch} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Switch
    size=${size}
    checked=${checked}
    disabled=${state === 'Disabled'}
    loading=${state === 'Loading'}
    content=${contentVisible ? contentText : undefined}
/>`,
    metadata: {nestable: true},
};
