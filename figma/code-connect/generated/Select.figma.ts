// url=https://www.figma.com/design/GihZUtevc7oCwpDQrcdR4i/YC-Gravity-UI-Code-connect-test?node-id=43749%3A467962
// source=src/components/Select/Select.tsx
// component=Select
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'S': 's', 'M': 'm', 'L': 'l', 'XL': 'xl'});
const view = instance.getEnum('View', {'Normal': 'normal', 'Clear': 'clear'});
const state = instance.getEnum('State', {'Suggest': 'Suggest', 'Default': 'Default', 'Hover': 'Hover', 'Disabled': 'Disabled', 'Active': 'Active', 'Error inline': 'Error inline', 'Error outline': 'Error outline'});
const labelVisible = instance.getBoolean('Label');
const contentVisible = instance.getBoolean('Content');
const hasClear = instance.getBoolean('Clear icon');
const labelText = instance.getString('↳ Label text') || 'Label';
const contentText = instance.getString('↳ Content text') || 'Select';
const errorText = instance.getString('Error text') || 'Error';
const isInvalid = state === 'Error inline' || state === 'Error outline';
const errorPlacement = state === 'Error inline' ? 'inside' : 'outside';

export default {
    id: 'select',
    imports: ["import {Select} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Select
    size=${size}
    view=${view}
    label=${labelVisible ? labelText : undefined}
    placeholder=${contentVisible ? contentText : undefined}
    hasClear=${hasClear}
    disabled=${state === 'Disabled'}
    validationState=${isInvalid ? 'invalid' : undefined}
    errorPlacement=${isInvalid ? errorPlacement : undefined}
    errorMessage=${isInvalid ? errorText : undefined}
/>`,
    metadata: {nestable: true},
};
