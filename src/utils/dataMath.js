import { round } from "../UnitHelper";

export function calculateAverage(data) {
    if (data.length === 0) {
        return 0.0;
    }

    let totalArea = 0.0;
    // Compute the area under the curve for each pair of consecutive points.
    for (let i = 1; i < data.length; i++) {
        const x1 = data[i - 1].timestamp;
        const y1 = data[i - 1].value;
        const x2 = data[i].timestamp;
        const y2 = data[i].value;

        // Calculate the area of the trapezium formed by two consecutive data points.
        const area = (x2 - x1) * (y1 + y2) / 2.0;
        totalArea += area;
    }

    // Calculate the width of the x-range.
    const timeSpan = data[data.length - 1].timestamp - data[0].timestamp;

    // If all data points have the same x-value, simply return the average of their y-values.
    if (timeSpan === 0) {
        const sumYValues = data.reduce((sum, entry) => sum + entry.value, 0);
        return sumYValues / data.length;
    }

    // Compute the average using the trapezoidal rule.
    return round(totalArea / timeSpan, 2);
}