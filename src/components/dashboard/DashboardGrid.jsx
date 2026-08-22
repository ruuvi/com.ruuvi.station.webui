import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box, useMediaQuery } from "@chakra-ui/react";
import debounce from "../../utils/debounce";
import { computeGridDimensions, computeMasonryLayout } from "./masonryLayout";

function DashboardGrid(props) {
    const [isLargeDisplay] = useMediaQuery(["(min-width: 1700px)"], { ssr: false });
    const [isMediumDisplay] = useMediaQuery(["(min-width: 1024px)"], { ssr: false });
    const gridRef = useRef(null);
    // Only the column count goes through React state — it is the one layout
    // value the cards render differently on. Everything else (widths,
    // positions, container height) is written straight to the DOM so a window
    // resize never re-renders the card tree.
    const [columnCount, setColumnCount] = useState(1);

    const onSizeChangeRef = useRef(props.onSizeChange);
    onSizeChangeRef.current = props.onSizeChange;
    const debouncedOnSizeChange = useRef(debounce(size => onSizeChangeRef.current(size), 150)).current;

    let size;
    if (isLargeDisplay) size = "large";
    else if (isMediumDisplay) size = "medium";
    else size = "mobile";

    useEffect(() => {
        if (props.currSize !== size) debouncedOnSizeChange(size);
    }, [props.currSize, size, debouncedOnSizeChange]);

    const gap = size === "mobile" ? 10 : 20;
    const minCardWidth = isLargeDisplay ? 450 : isMediumDisplay ? 350 : props.showGraph ? 280 : 320;

    // Masonry layout pass: size the items to the column width, measure them,
    // and position each into the currently shortest column. Layout effect so
    // the initial pass lands before first paint — on page load the cards must
    // appear directly in place, not stacked at (0,0).
    useLayoutEffect(() => {
        if (props.disableAdaptiveLayout) return;
        const grid = gridRef.current;
        if (!grid) return;
        const items = Array.from(grid.querySelectorAll('.masonry-item'));
        if (items.length === 0) {
            grid.style.height = '0px';
            return;
        }

        let rafId = null;
        const lastHeights = new Map();

        const performLayout = () => {
            rafId = null;
            if (!gridRef.current) return;
            const containerWidth = grid.clientWidth;
            if (containerWidth === 0) {
                grid.style.height = '0px';
                return;
            }
            grid.style.height = '';

            const dims = computeGridDimensions({ containerWidth, minCardWidth, gap });
            if (dims.columnCount <= 0 || dims.columnWidth <= 0) {
                grid.style.height = '0px';
                return;
            }
            setColumnCount(dims.columnCount); // bails out unless the count actually changed

            items.forEach(item => {
                item.style.width = `${dims.columnWidth}px`;
            });
            grid.offsetHeight; // force reflow so measured heights reflect the new width

            const itemHeights = items.map(item => item.offsetHeight);
            items.forEach((item, i) => lastHeights.set(item, itemHeights[i]));

            const { positions, containerHeight } = computeMasonryLayout({ itemHeights, containerWidth, minCardWidth, gap });
            items.forEach((item, i) => {
                item.style.transform = `translate(${positions[i].x}px, ${positions[i].y}px)`;
            });
            grid.style.height = `${containerHeight}px`;

            // Enable position animations only after the initial transforms have
            // been committed without them, so cards don't fly in from the
            // top-left corner on page load.
            if (!grid.classList.contains('masonry-ready')) {
                grid.offsetHeight;
                grid.classList.add('masonry-ready');
            }
        };

        const scheduleLayout = () => {
            if (rafId === null) rafId = requestAnimationFrame(performLayout);
        };

        performLayout();

        // Container width changes relayout on the next frame, undebounced:
        // ResizeObserver reports at most once per frame and the pass is
        // DOM-only, so cards track a window resize live. The observer also
        // fires for our own container height writes — width comparison
        // filters those out.
        let lastContainerWidth = grid.clientWidth;
        const containerResizeObserver = new ResizeObserver(() => {
            if (grid.clientWidth !== lastContainerWidth) {
                lastContainerWidth = grid.clientWidth;
                scheduleLayout();
            }
        });
        containerResizeObserver.observe(grid);

        // Relayout when a card's height changes (image loads, graph appears,
        // search hides it). Our own width/transform writes retrigger the
        // observer, so only an actual height change schedules a new pass.
        const debouncedItemResize = debounce(scheduleLayout, 50);
        const itemResizeObserver = new ResizeObserver(entries => {
            const changed = entries.some(entry => lastHeights.get(entry.target) !== entry.target.offsetHeight);
            if (changed) debouncedItemResize();
        });
        items.forEach(item => itemResizeObserver.observe(item));

        return () => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            debouncedItemResize.cancel();
            containerResizeObserver.disconnect();
            itemResizeObserver.disconnect();
        };
    }, [size, columnCount, props.order, props.sensors, gap, minCardWidth, props.disableAdaptiveLayout]);

    // Non-adaptive layout: simple CSS grid with equal height rows
    if (props.disableAdaptiveLayout) {
        const simpleMinCardWidth = isLargeDisplay ? 500 : isMediumDisplay ? 400 : props.showGraph ? 300 : 360;
        return (
            <Box
                key="non-adaptive"
                style={{ marginBottom: 30, marginTop: 10 }}
                justifyItems="start"
                display="grid"
                gap={gap + "px"}
                gridTemplateColumns={`repeat(auto-fit, minmax(${simpleMinCardWidth}px, max-content))`}
            >
                {props.children(size, null)}
            </Box>
        );
    }

    return (
        <Box
            key="adaptive"
            ref={gridRef}
            className="masonry-grid"
            css={{
                marginBottom: "30px",
                marginTop: "10px",
                position: "relative",
                display: "grid",
                gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))`,
                columnGap: `${gap}px`,
                rowGap: `${gap}px`,
                "& > span": {
                    position: "absolute",
                },
                "&.masonry-ready > span": {
                    transition: "transform 0.2s ease, width 0.2s ease",
                }
            }}
        >
            {props.children(size, columnCount)}
        </Box>
    );
}

export default DashboardGrid;
