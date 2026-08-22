import React from "react";
import { Progress, ProgressCircle } from "@chakra-ui/react";

// v3 splits Progress into root/track/range. This keeps the single-element
// call sites the app already had; `value={null}` is v3's indeterminate state.
export function ProgressBar({ value = null, max, ...rest }) {
    return (
        <Progress.Root value={value} max={max} {...rest}>
            <Progress.Track>
                <Progress.Range />
            </Progress.Track>
        </Progress.Root>
    );
}

export default ProgressBar;

// v2's <CircularProgress isIndeterminate /> equivalent. v2 drew the ring on a
// 100-unit viewBox, so its `thickness` (10% by default) scaled with the circle;
// v3 wants an absolute width, hence the explicit values at the call sites.
export function CircleProgress({ size = "lg", boxSize, thickness, color, trackColor, css, ...rest }) {
    return (
        <ProgressCircle.Root
            value={null}
            size={size}
            css={{
                ...(boxSize ? { "--size": boxSize } : null),
                ...(thickness ? { "--thickness": thickness } : null),
                ...css,
            }}
            {...rest}
        >
            <ProgressCircle.Circle>
                <ProgressCircle.Track css={trackColor ? { "--track-color": trackColor } : undefined} />
                <ProgressCircle.Range css={color ? { stroke: color } : undefined} />
            </ProgressCircle.Circle>
        </ProgressCircle.Root>
    );
}
