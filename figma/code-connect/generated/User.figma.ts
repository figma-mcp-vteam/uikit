// url=https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/YC%20Gravity%20UI%20%E2%80%93%20Code%20connect%20test?node-id=51015%3A45880
// source=https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/User/User.tsx
// component=User
import figma from 'figma';

const instance = figma.selectedInstance;
const size = instance.getEnum('Size', {'3XS': '3xs', '2XS': '2xs', 'XS': 'xs', 'S': 's', 'M': 'm', 'L': 'l', 'XL': 'xl'});
const name = instance.getString('↳ Content text') || 'UserName';
const secondaryVisible = instance.getBoolean('Secondary content');
const description = instance.getString('↳ Secondary content text') || 'user_mail@ya.ru';

export default {
    id: 'user',
    imports: ["import {User} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<User${figma.helpers.react.renderProp('size', size)}${figma.helpers.react.renderProp('name', name)}${figma.helpers.react.renderProp('description', secondaryVisible ? description : undefined)} />`,
    metadata: {nestable: true},
};
