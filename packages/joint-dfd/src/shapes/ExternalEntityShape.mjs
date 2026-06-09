// ExternalEntityShape — DFD External Entity.
// Sharp-cornered rectangle. Dashed variant for `external-service` sub-type.

import { dia } from '@joint/core';

const portGroups = {
    in: {
        position: { name: 'left' },
        attrs: {
            portBody: {
                magnet: 'passive',
                r: 5,
                fill: '#FFFFFF',
                stroke: '#E65100',
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
                stroke: '#E65100',
                strokeWidth: 1.5
            }
        }
    }
};

export const ExternalEntityShape = dia.Element.define('dfd.ExternalEntityShape', {
    size: { width: 120, height: 60 },
    attrs: {
        root: {
            magnet: false
        },
        body: {
            width: 'calc(w)',
            height: 'calc(h)',
            rx: 0,
            ry: 0,
            fill: '#FFF3E0',
            stroke: '#E65100',
            strokeWidth: 1.5
        },
        label: {
            x: 'calc(w/2)',
            y: 'calc(h/2)',
            textVerticalAnchor: 'middle',
            textAnchor: 'middle',
            fontSize: 13,
            fontFamily: 'sans-serif',
            fill: '#BF360C',
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
        { tagName: 'text', selector: 'label' }
    ],

    portMarkup: [
        { tagName: 'circle', selector: 'portBody' }
    ],

    setName(name) {
        return this.attr('label/text', name);
    },

    // Toggle dashed border (used for the `external-service` variant).
    setDashed(dashed) {
        return this.attr('body/strokeDasharray', dashed ? '6,3' : 'none');
    }
});
