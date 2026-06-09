// DataStoreShape — DFD Data Store.
// Classic notation: two parallel horizontal lines with a label between them.

import { dia } from '@joint/core';

const portGroups = {
    in: {
        position: { name: 'left' },
        attrs: {
            portBody: {
                magnet: 'passive',
                r: 5,
                fill: '#FFFFFF',
                stroke: '#2E7D32',
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
                stroke: '#2E7D32',
                strokeWidth: 1.5
            }
        }
    }
};

export const DataStoreShape = dia.Element.define('dfd.DataStoreShape', {
    size: { width: 140, height: 50 },
    attrs: {
        root: {
            magnet: false
        },
        // Invisible interaction surface so the element receives pointer events.
        body: {
            width: 'calc(w)',
            height: 'calc(h)',
            fill: 'transparent',
            stroke: 'none',
            pointerEvents: 'all'
        },
        topLine: {
            x1: 0,
            y1: 0,
            x2: 'calc(w)',
            y2: 0,
            stroke: '#2E7D32',
            strokeWidth: 1.5
        },
        bottomLine: {
            x1: 0,
            y1: 'calc(h)',
            x2: 'calc(w)',
            y2: 'calc(h)',
            stroke: '#2E7D32',
            strokeWidth: 1.5
        },
        label: {
            x: 'calc(w/2)',
            y: 'calc(h/2)',
            textVerticalAnchor: 'middle',
            textAnchor: 'middle',
            fontSize: 13,
            fontFamily: 'sans-serif',
            fill: '#1B5E20',
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
        { tagName: 'line', selector: 'topLine' },
        { tagName: 'line', selector: 'bottomLine' },
        { tagName: 'text', selector: 'label' }
    ],

    portMarkup: [
        { tagName: 'circle', selector: 'portBody' }
    ],

    setName(name) {
        return this.attr('label/text', name);
    }
});
