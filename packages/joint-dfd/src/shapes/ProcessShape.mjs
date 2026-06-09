// ProcessShape — DFD Process (Shostack/STRIDE).
// Rounded rectangle with centred label and left/right ports for DataFlowLink connections.

import { dia } from '@joint/core';

const portGroups = {
    in: {
        position: { name: 'left' },
        attrs: {
            portBody: {
                magnet: 'passive',
                r: 5,
                fill: '#FFFFFF',
                stroke: '#1565C0',
                strokeWidth: 1.5
            }
        }
    },
    out: {
        position: { name: 'right' },
        attrs: {
            portBody: {
                magnet: true,
                r: 5,
                fill: '#FFFFFF',
                stroke: '#1565C0',
                strokeWidth: 1.5
            }
        }
    }
};

export const ProcessShape = dia.Element.define('dfd.ProcessShape', {
    size: { width: 120, height: 60 },
    attrs: {
        root: {
            magnet: false
        },
        body: {
            width: 'calc(w)',
            height: 'calc(h)',
            rx: 10,
            ry: 10,
            fill: '#E3F2FD',
            stroke: '#1565C0',
            strokeWidth: 1.5
        },
        icon: {
            x: 8,
            y: 8,
            width: 16,
            height: 16,
            preserveAspectRatio: 'xMidYMid',
            display: 'none'
        },
        label: {
            x: 'calc(w/2)',
            y: 'calc(h/2)',
            textVerticalAnchor: 'middle',
            textAnchor: 'middle',
            fontSize: 13,
            fontFamily: 'sans-serif',
            fill: '#0D47A1',
            text: ''
        }
    },
    ports: {
        groups: portGroups,
        items: [
            { id: 'in', group: 'in' },
            { id: 'out', group: 'out' }
        ]
    }
}, {
    markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'image', selector: 'icon' },
        { tagName: 'text', selector: 'label' }
    ],

    portMarkup: [
        { tagName: 'circle', selector: 'portBody' }
    ],

    setName(name) {
        return this.attr('label/text', name);
    },

    setIcon(href) {
        return this.attr('icon', { 'xlink:href': href, display: href ? 'inline' : 'none' });
    }
});
