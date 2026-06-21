// url=https://www.figma.com/design/5vAAQi3Iwj9tACtMsduGos/YC%20Gravity%20UI%20%E2%80%93%20Code%20connect%20test?node-id=44798%3A511299
// source=https://github.com/figma-mcp-vteam/uikit/blob/main/src/components/Card/Card.tsx
// component=Card
import figma from 'figma';

const instance = figma.selectedInstance;
const cardVariant = instance.getEnum('Type', {'With themes': 'With themes', 'Selectable card': 'Selectable card', 'Raised': 'Raised', 'Raised+Action': 'Raised+Action'});
const children = 'Card content';
const type = cardVariant === 'Selectable card' ? 'selection' : cardVariant === 'Raised+Action' ? 'action' : 'container';
const view = cardVariant === 'Raised' ? 'raised' : cardVariant === 'Selectable card' ? 'outlined' : undefined;
const theme = cardVariant === 'With themes' ? 'info' : undefined;
const selected = cardVariant === 'Selectable card';

export default {
    id: 'card',
    imports: ["import {Card} from '@gravity-ui/uikit';"],
    example: figma.tsx`
<Card${figma.helpers.react.renderProp('type', type)}${figma.helpers.react.renderProp('view', view)}${figma.helpers.react.renderProp('theme', theme)}${figma.helpers.react.renderProp('selected', selected)}>
    ${figma.helpers.react.renderChildren(children)}
</Card>`,
    metadata: {nestable: true},
};
