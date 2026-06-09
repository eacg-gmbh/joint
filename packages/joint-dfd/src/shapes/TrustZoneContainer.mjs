// TrustZoneContainer — DFD Trust Boundary.
// Dashed-border rectangle, tinted background interpolated from `trustRating` (0..100).
// Hosts embedded child elements via JointJS parent-child embedding.

import { dia } from '@joint/core';

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

// Linear interpolation across red → yellow → green, with the given alpha.
// rating ∈ [0, 100]; alpha defaults to 0.1 per spec.
export function trustRatingToFill(rating, alpha = 0.1) {
    const r = Math.max(0, Math.min(100, Number.isFinite(rating) ? rating : 50));
    let red;
    let green;
    if (r <= 50) {
        const t = r / 50;
        red = 244;
        green = Math.round(67 + (193 - 67) * t);
    } else {
        const t = (r - 50) / 50;
        red = Math.round(244 + (76 - 244) * t);
        green = Math.round(193 + (175 - 193) * t);
    }
    const blue = r <= 50 ? Math.round(54 + (7 - 54) * (r / 50)) : Math.round(7 + (80 - 7) * ((r - 50) / 50));
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export const TrustZoneContainer = dia.Element.define('dfd.TrustZoneContainer', {
    size: { width: MIN_WIDTH, height: MIN_HEIGHT },
    trustRating: 50,
    attrs: {
        root: {
            magnet: false
        },
        body: {
            width: 'calc(w)',
            height: 'calc(h)',
            fill: trustRatingToFill(50),
            stroke: '#616161',
            strokeWidth: 1.5,
            strokeDasharray: '8,4',
            rx: 4,
            ry: 4
        },
        label: {
            x: 12,
            y: 18,
            textVerticalAnchor: 'middle',
            textAnchor: 'start',
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            fill: '#212121',
            text: ''
        }
    }
}, {
    markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'text', selector: 'label' }
    ],

    initialize(...args) {
        dia.Element.prototype.initialize.apply(this, args);
        this.on('change:trustRating', this._updateFill, this);
        // Clamp to minimum size on resize.
        this.on('change:size', this._enforceMinSize, this);
        // Apply fill from initial attributes.
        this._updateFill();
    },

    _updateFill() {
        this.attr('body/fill', trustRatingToFill(this.get('trustRating')));
    },

    _enforceMinSize() {
        const { width, height } = this.get('size');
        const w = Math.max(MIN_WIDTH, width);
        const h = Math.max(MIN_HEIGHT, height);
        if (w !== width || h !== height) {
            this.resize(w, h);
        }
    },

    setZoneName(name) {
        return this.attr('label/text', name);
    },

    setTrustRating(rating) {
        return this.set('trustRating', rating);
    }
}, {
    MIN_WIDTH,
    MIN_HEIGHT
});
