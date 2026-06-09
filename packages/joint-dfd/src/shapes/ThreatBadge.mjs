// ThreatBadge — small overlay that decorates an element or link with a threat count.
// Visualises a single number coloured by threat state. Clicking emits
// `badge:pointerclick` on the host cellView with the cell's id.
//
// Usage:
//   ThreatBadge.add(cellView, { count: 3, state: 'identified' });
//   ThreatBadge.remove(cellView);

import { dia, V } from '@joint/core';

const BADGE_RADIUS = 12;

// Map threat state → badge colour group (per joint_Claude.md).
const STATE_COLOUR_GROUP = {
    exposed: 'red',
    identified: 'red',
    assessed: 'yellow',
    planned: 'yellow',
    implementing: 'yellow',
    closed: 'green',
    eliminated: 'green',
    accepted: 'grey',
    monitored: 'grey',
    deferred: 'grey',
    'out-of-scope': 'grey',
    transferred: 'grey',
    escalated: 'grey',
    expired: 'grey'
};

const COLOURS = {
    red:    { fill: '#D32F2F', stroke: '#B71C1C', text: '#FFFFFF' },
    yellow: { fill: '#FBC02D', stroke: '#F57F17', text: '#212121' },
    green:  { fill: '#388E3C', stroke: '#1B5E20', text: '#FFFFFF' },
    grey:   { fill: '#9E9E9E', stroke: '#616161', text: '#FFFFFF' }
};

export function badgeColourForState(state) {
    const group = STATE_COLOUR_GROUP[state] || 'grey';
    return COLOURS[group];
}

export const ThreatBadge = dia.HighlighterView.extend({

    tagName: 'g',
    className: 'dfd-threat-badge',

    UPDATE_ATTRIBUTES() {
        return ['threats'];
    },

    options: {
        count: 0,
        state: 'identified',
        radius: BADGE_RADIUS
    },

    events: {
        'mousedown': 'onPointerClick',
        'touchstart': 'onPointerClick'
    },

    onPointerClick(evt) {
        evt.stopPropagation();
        const { cellView } = this;
        if (!cellView) return;
        cellView.notify('badge:pointerclick', cellView.model.id, evt);
    },

    highlight(cellView) {
        const { vel, options } = this;
        const { count = 0, state, radius = BADGE_RADIUS } = options;
        const colours = badgeColourForState(state);

        vel.empty();

        const circle = V('circle', {
            r: radius,
            fill: colours.fill,
            stroke: colours.stroke,
            'stroke-width': 1,
            cursor: 'pointer'
        });

        const text = V('text', {
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            'font-size': 11,
            'font-weight': 'bold',
            'font-family': 'sans-serif',
            fill: colours.text,
            'pointer-events': 'none'
        });
        text.node.textContent = String(count);

        vel.append([circle, text]);

        this.position(cellView);
    },

    position(cellView) {
        const { vel, options } = this;
        const { radius = BADGE_RADIUS } = options;
        const model = cellView.model;
        let x;
        let y;
        if (model.isLink && model.isLink()) {
            // Midpoint of the link's connection path.
            try {
                const connection = cellView.getConnection();
                const length = connection.length();
                const point = connection.pointAtLength(length / 2);
                x = point.x;
                y = point.y;
            } catch {
                const { x: bx, y: by, width, height } = cellView.getBBox();
                x = bx + width / 2;
                y = by + height / 2;
            }
        } else {
            // Top-right corner of the element.
            const { width } = model.size();
            x = width - radius / 2;
            y = radius / 2;
        }
        vel.attr('transform', `translate(${x}, ${y})`);
    }

}, {
    BADGE_RADIUS,
    STATE_COLOUR_GROUP,
    COLOURS,

    // Attach a badge to a cellView with the given count + state.
    attach(cellView, { count = 0, state = 'identified', id = 'dfd-threat-badge' } = {}) {
        return this.add(cellView, 'root', id, { count, state });
    },

    // Detach the badge from a cellView.
    detach(cellView, id = 'dfd-threat-badge') {
        const view = this.get(cellView, id);
        if (view) view.remove();
    }
});
