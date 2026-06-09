// elkLayout — stub for the ELK.js hierarchical auto-layout.
// The real implementation lands in inc-3 (DFD-05). This stub is a no-op so the
// OTM adapter can call it unconditionally when no position data is present.

export function elkLayout(graph /* , options */) {
    // No-op stub. The real version will compute and apply positions to
    // all cells in the graph using elkjs.
    return graph;
}
