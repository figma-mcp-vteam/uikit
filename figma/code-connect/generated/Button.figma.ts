// url=https://www.figma.com/design/GihZUtevc7oCwpDQrcdR4i/YC-Gravity-UI-Code-connect-test?node-id=41899%3A462118
// source=src/components/Button/Button.tsx
// component=Button
import figma from 'figma';

const instance = figma.selectedInstance;
const view = instance.getEnum('View', {'Normal': 'normal', 'Action': 'action', 'Outline': 'outlined', 'Outline-info': 'outlined-info', 'Outlined-success': 'outlined-success', 'Outlined-warning': 'outlined-warning', 'Outline-danger': 'outlined-danger', 'Outline-utility': 'outlined-utility', 'Outlined-action': 'outlined-action', 'Flat': 'flat', 'Flat-info': 'flat-info', 'Flat-success': 'flat-success', 'Flat-warning': 'flat-warning', 'Flat-danger': 'flat-danger', 'Flat-utility': 'flat-utility', 'Flat-action': 'flat-action', 'Flat-secondary': 'flat-secondary', 'Raised': 'raised', 'Normal-contrast': 'normal-contrast', 'Outline-contrast': 'outlined-contrast', 'Flat-contrast': 'flat-contrast'});
const size = instance.getEnum('Size', {'XS': 'xs', 'S': 's', 'M': 'm', 'L': 'l', 'XL': 'xl'});
const state = instance.getEnum('State', {'Default': 'Default', 'Hover': 'Hover', 'Disabled': 'Disabled', 'Loading': 'Loading', 'Selected': 'Selected', 'Selected hover': 'Selected hover'});
const children = instance.getString('Content') || 'Button';

export default {
    id: 'button',
    imports: ["import {Button} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Button
    view=${view}
    size=${size}
    disabled=${state === 'Disabled'}
    loading=${state === 'Loading'}
    selected=${state === 'Selected' || state === 'Selected hover'}
>
    ${children}
</Button>`,
    metadata: {nestable: true},
};
