
export default function UplotTouchZoomPlugin(xRange) {
    function init(u, opts, data) {
        let over = u.over;
        let rect, oxRange, oyRange, xVal, yVal;
        let fr = { x: 0, y: 0, dx: 0, dy: 0 };
        let to = { x: 0, y: 0, dx: 0, dy: 0 };

        function storePos(t, e) {
            let ts = e.touches;

            let t0 = ts[0];
            let t0x = t0.clientX - rect.left;
            let t0y = t0.clientY - rect.top;

            if (ts.length === 1) {
                t.x = t0x;
                t.y = t0y;
                t.d = t.dx = t.dy = 1;
            }
            else {
                let t1 = e.touches[1];
                let t1x = t1.clientX - rect.left;
                let t1y = t1.clientY - rect.top;

                let xMin = Math.min(t0x, t1x);
                let yMin = Math.min(t0y, t1y);
                let xMax = Math.max(t0x, t1x);
                let yMax = Math.max(t0y, t1y);

                // midpts
                t.y = (yMin + yMax) / 2;
                t.x = (xMin + xMax) / 2;

                const deadzone = 20
                let newDx = xMax - xMin
                let newDy = yMax - yMin
                //t.dx = xMax - xMin;
                //t.dy = yMax - yMin;
                if (newDx > deadzone || newDx < -1 * deadzone) t.dx = newDx
                if (newDy > deadzone || newDy < -1 * deadzone) t.dy = newDy

                // dist
                t.d = Math.sqrt(t.dx * t.dx + t.dy * t.dy);
            }
        }

        let rafPending = false;

        function zoom() {
            rafPending = false;

            let left = to.x;
            let top = to.y;

            //non-uniform scaling, needs some work
            let xFactor = fr.dx / to.dx;
            let yFactor = fr.dy / to.dy;

            // uniform x/y scaling
            //let xFactor = fr.d / to.d;
            //let yFactor = fr.d / to.d;

            let leftPct = left / rect.width;
            let btmPct = 1 - top / rect.height;

            let nxRange = oxRange * xFactor;
            let nxMin = xVal - leftPct * nxRange;
            let nxMax = nxMin + nxRange;

            let nyRange = oyRange * yFactor;
            let nyMin = yVal - btmPct * nyRange;
            let nyMax = nyMin + nyRange;

            if (nxMin < xRange[0]) {
                nxMin = xRange[0]
            }
            if (nxMax > xRange[1]) {
                nxMax = xRange[1]
            }

            u.batch(() => {
                u.setScale("x", {
                    min: nxMin,
                    max: nxMax,
                });

                u.setScale("y", {
                    min: nyMin,
                    max: nyMax,
                });
            });
        }

        function touchmove(e) {
            storePos(to, e);

            if (!rafPending) {
                rafPending = true;
                requestAnimationFrame(zoom);
            }
        }

        function touchmovepan(e) {
            const touch = e.changedTouches[0];
            const rect = u.over.getBoundingClientRect();
            const offsetX = touch.clientX - rect.left;
            const offsetY = touch.clientY - rect.top;
            u.setCursor({
                left: offsetX,
                top: offsetY,
            });
        }

        over.addEventListener("touchstart", function (e) {
            if (e.touches.length === 1) {
                document.addEventListener("touchmove", touchmovepan, { passive: true });
                document.getElementsByClassName("u-legend")[0].style.visibility = '';
            }
            if (e.touches.length < 2) return;
            document.removeEventListener("touchmove", touchmovepan, { passive: true });
            rect = over.getBoundingClientRect();

            storePos(fr, e);

            oxRange = u.scales.x.max - u.scales.x.min;
            oyRange = u.scales.y.max - u.scales.y.min;

            let left = fr.x;
            let top = fr.y;

            xVal = u.posToVal(left, "x");
            yVal = u.posToVal(top, "y");

            e.preventDefault()
            document.addEventListener("touchmove", touchmove, { passive: true });
        });

        over.addEventListener("touchend", function (e) {
            document.removeEventListener("touchmove", touchmove, { passive: true });
            document.removeEventListener("touchmove", touchmovepan, { passive: true });
        });
    }

    return {
        hooks: {
            init
        }
    };
}