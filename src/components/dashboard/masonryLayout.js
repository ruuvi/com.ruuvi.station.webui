// Pure math for the dashboard masonry layout, extracted so it can be unit
// tested. Quirks are intentional and match the layout this was ported from:
// the container height subtracts one gap, and there is no vertical gap term —
// vertical spacing comes from the measured item heights themselves.

export function computeGridDimensions({ containerWidth, minCardWidth, gap }) {
    const columnCount = Math.max(1, Math.floor((containerWidth + gap) / (minCardWidth + gap)));
    const columnWidth = Math.floor((containerWidth - gap * (columnCount - 1)) / columnCount);
    return { columnCount, columnWidth };
}

// Places items in order into the currently shortest column; ties go to the
// leftmost column. itemHeights must be measured after applying columnWidth.
export function computeMasonryLayout({ itemHeights, containerWidth, minCardWidth, gap }) {
    const { columnCount, columnWidth } = computeGridDimensions({ containerWidth, minCardWidth, gap });
    const columnHeights = Array(columnCount).fill(0);
    const positions = itemHeights.map(height => {
        const col = columnHeights.indexOf(Math.min(...columnHeights));
        const x = col * (columnWidth + gap);
        const y = columnHeights[col];
        columnHeights[col] += height;
        return { x, y };
    });
    const containerHeight = Math.max(0, Math.max(...columnHeights) - gap);
    return { columnCount, columnWidth, positions, containerHeight };
}
