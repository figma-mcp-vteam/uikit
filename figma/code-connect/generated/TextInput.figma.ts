// url=https://www.figma.com/design/1xmAVpNG0xrBD9LqsOYWSk/Gravity-UI-MCP-Fun?node-id=53175%3A148339
// source=src/components/controls/TextInput/TextInput.tsx
// component=TextInput
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'S': 's', 'M': 'm', 'L': 'l', 'XL': 'xl'});
const view = instance.getEnum('View', {'Normal': 'normal', 'Clear': 'clear'});
const state = instance.getEnum('State', {'Suggest': 'Suggest', 'Default': 'Default', 'Hovered': 'Hovered', 'Selected': 'Selected', 'Disabled': 'Disabled', 'Error inline': 'Error inline', 'Error outline': 'Error outline'});
const contentVisible = instance.getBoolean('Content');
const labelVisible = instance.getBoolean('Label');
const hasClear = instance.getBoolean('Clear button');
const labelText = instance.getString('↳ Label text') || 'Label';
const contentText = instance.getString('↳ Content text') || 'Text';
const errorText = instance.getString('Error text') || 'Error';
const isInvalid = state === 'Error inline' || state === 'Error outline';
const errorPlacement = state === 'Error inline' ? 'inside' : 'outside';

export default {
    id: 'text-input',
    imports: ["import {TextInput} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<TextInput
    size=${size}
    view=${view}
    label=${labelVisible ? labelText : undefined}
    defaultValue=${contentVisible ? contentText : undefined}
    hasClear=${hasClear}
    disabled=${state === 'Disabled'}
    validationState=${isInvalid ? 'invalid' : undefined}
    errorPlacement=${isInvalid ? errorPlacement : undefined}
    errorMessage=${isInvalid ? errorText : undefined}
/>`,
    metadata: {nestable: true},
};
