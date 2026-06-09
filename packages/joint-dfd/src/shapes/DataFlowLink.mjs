// DataFlowLink — DFD Data Flow.
// Directed arrow with an asset-name label at the midpoint.
// Bidirectional variant draws arrows at both ends.

import { dia } from '@joint/core';

const DEFAULT_STROKE = '#616161';

const arrowMarker = {
    type: 'path',
    d: 'M 10 -5 0 0 10 5 z',
    fill: DEFAULT_STROKE,
    stroke: DEFAULT_STROKE
};

export const DataFlowLink = dia.Link.define('dfd.DataFlowLink', {
    attrs: {
        line: {
            connection: true,
            stroke: DEFAULT_STROKE,
            strokeWidth: 1.5,
            strokeLinejoin: 'round',
            targetMarker: arrowMarker
        },
        wrapper: {
            connection: true,
            strokeWidth: 10,
            strokeLinejoin: 'round'
        }
    },
    bidirectional: false,
    labels: [{
        position: 0.5,
        attrs: {
            text: {
                text: '',
                fontSize: 11,
                fontFamily: 'sans-serif',
                fill: '#424242',
                textAnchor: 'middle',
                textVerticalAnchor: 'middle'
            },
            rect: {
                fill: '#FFFFFF',
                stroke: '#BDBDBD',
                strokeWidth: 0.5,
                rx: 2,
                ry: 2,
                ref: 'text',
                refWidth: '110%',
                refHeight: '110%',
                refX: '-5%',
                refY: '-5%'
            }
        }
    }]
}, {
    markup: [{
        tagName: 'path',
        selector: 'wrapper',
        attributes: {
            'fill': 'none',
            'cursor': 'pointer',
            'stroke': 'transparent',
            'stroke-linecap': 'round'
        }
    }, {
        tagName: 'path',
        selector: 'line',
        attributes: {
            'fill': 'none',
            'pointer-events': 'none'
        }
    }],

    // Set comma-separated asset names as label text.
    setAssetNames(assets) {
        const text = Array.isArray(assets) ? assets.join(', ') : String(assets || '');
        return this.prop('labels/0/attrs/text/text', text);
    },

    // Override stroke colour (e.g. red for unmitigated threats).
    setColour(colour) {
        const stroke = colour || DEFAULT_STROKE;
        this.attr('line/stroke', stroke);
        this.attr('line/targetMarker/fill', stroke);
        this.attr('line/targetMarker/stroke', stroke);
        if (this.get('bidirectional')) {
            this.attr('line/sourceMarker/fill', stroke);
            this.attr('line/sourceMarker/stroke', stroke);
        }
        return this;
    },

    // Toggle the bidirectional arrow variant.
    setBidirectional(flag) {
        const colour = this.attr('line/stroke') || DEFAULT_STROKE;
        if (flag) {
            this.attr('line/sourceMarker', {
                type: 'path',
                d: 'M 10 -5 0 0 10 5 z',
                fill: colour,
                stroke: colour
            });
        } else {
            this.removeAttr('line/sourceMarker');
        }
        this.set('bidirectional', !!flag);
        return this;
    }
});
