// Debounce with a .cancel() handle so effects can clear a pending call on cleanup.
export default function debounce(func, delay) {
    let timeout;
    const debounced = function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
    debounced.cancel = () => clearTimeout(timeout);
    return debounced;
}
