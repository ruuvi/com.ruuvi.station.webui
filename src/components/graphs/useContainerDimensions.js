import { useEffect, useState } from "react";

// Measures the width/height of the element behind `myRef`. Uses a
// ResizeObserver when available so layout-driven size changes (not just
// window resizes) are picked up; falls back to a window resize listener.
const useContainerDimensions = (myRef) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const measure = () => {
            setDimensions((prev) => {
                const width = myRef.current?.offsetWidth || 0;
                const height = myRef.current?.offsetHeight || 0;
                if (prev.width === width && prev.height === height) return prev;
                return { width, height };
            });
        };

        measure();

        if (typeof ResizeObserver !== "undefined" && myRef.current) {
            const observer = new ResizeObserver(measure);
            observer.observe(myRef.current);
            return () => observer.disconnect();
        }

        window.addEventListener("resize", measure);
        return () => window.removeEventListener("resize", measure);
    }, [myRef]);

    return dimensions;
};

export default useContainerDimensions;
