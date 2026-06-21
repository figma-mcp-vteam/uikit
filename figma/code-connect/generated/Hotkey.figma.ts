// url=https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/YC%20Gravity%20UI%20%E2%80%93%20Code%20connect%20test?node-id=77863%3A7673
// source=https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Hotkey/Hotkey.tsx
// component=Hotkey
import figma from 'figma';

const instance = figma.selectedInstance;
const platform = instance.getEnum('Platform', {'Mac': 'mac', 'PC': 'pc'});
const value = 'mod+a';

export default {
    id: 'hotkey',
    imports: ["import {Hotkey} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Hotkey${figma.helpers.react.renderProp('value', value)}${figma.helpers.react.renderProp('platform', platform)} />`,
    metadata: {nestable: true},
};
