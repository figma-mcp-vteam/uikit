// url=https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/YC%20Gravity%20UI%20%E2%80%93%20Code%20connect%20test?node-id=41226%3A428847
// source=https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Avatar/Avatar.tsx
// component=Avatar
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'3XS': '3xs', '2XS': '2xs', 'XS': 'xs', 'S': 's', 'M': 'm', 'L': 'l', 'XL': 'xl'});
const view = instance.getEnum('View', {'Filled': 'filled', 'Outlined': 'outlined'});
const theme = instance.getEnum('Theme', {'Brand': 'brand', 'Normal': 'normal'});
const text = instance.getString('↳ Content text') || 'AB';

export default {
    id: 'avatar',
    imports: ["import {Avatar} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Avatar${figma.helpers.react.renderProp('size', size)}${figma.helpers.react.renderProp('view', view)}${figma.helpers.react.renderProp('theme', theme)}${figma.helpers.react.renderProp('text', text)} />`,
    metadata: {nestable: true},
};
