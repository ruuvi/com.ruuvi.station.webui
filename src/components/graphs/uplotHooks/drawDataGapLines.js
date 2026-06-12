export default (u, si, strokeColor) => {
    if (si === 0) return; // only data series

    let ctx = u.ctx;
    let s = u.series[si];

    ctx.save();
    let xd = u.data[0];
    let yd = u.data[si];

    // ----- dashed line for data gaps
    ctx.beginPath();

    const devicePixelRatio = window.devicePixelRatio || 1;
    const baseWidth = Math.max(s.width, 1.3);

    const dashSize = Math.max(2 * devicePixelRatio, 2);
    const gapSize = Math.max(4 * devicePixelRatio, 4);

    ctx.setLineDash([dashSize, gapSize]);
    ctx.lineWidth = baseWidth * Math.max(devicePixelRatio, 1.3);
    ctx.strokeStyle = strokeColor;


    let lastValidIdx = -1;

    for (let i = 0; i < xd.length; i++) {
        if (yd[i] !== null) {
            if (lastValidIdx >= 0 && i - lastValidIdx > 1) {
                const x1 = u.valToPos(xd[lastValidIdx], 'x', true);
                const y1 = u.valToPos(yd[lastValidIdx], 'y', true);
                const x2 = u.valToPos(xd[i], 'x', true);
                const y2 = u.valToPos(yd[i], 'y', true);

                let pointsVisibleInX =
                    u.scales.x.min <= xd[i] && u.scales.x.max >= xd[i] &&
                    u.scales.x.min <= xd[lastValidIdx] && u.scales.x.max >= xd[lastValidIdx];

                let pointsVisibleInY =
                    (u.scales.y.min <= yd[i] && yd[i] <= u.scales.y.max) &&
                    (u.scales.y.min <= yd[lastValidIdx] && yd[lastValidIdx] <= u.scales.y.max);

                if (pointsVisibleInX && pointsVisibleInY) {
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                }
            }
            lastValidIdx = i;
        }
    }

    ctx.stroke();
    ctx.setLineDash([]); 
    ctx.restore();
}