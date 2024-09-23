export default {
    hooks: {
        init(u, opts) {
            const legend = document.getElementsByClassName("u-legend")[0];
            legend.style.visibility = 'hidden';

            u.over.addEventListener("mouseleave", () => {
                legend.style.visibility = 'hidden';
            });

            u.over.addEventListener("mousemove", () => {
                legend.style.visibility = '';
            });
        }
    }
};