export default function (hideClass = "u-legend") {
    return {
        hooks: {
            init(u, _opts) {
                const legend = document.getElementsByClassName(hideClass)[0];
                legend.style.visibility = 'hidden';

                u.over.addEventListener("mouseleave", () => {
                    legend.style.visibility = 'hidden';
                });

                u.over.addEventListener("mousemove", () => {
                    legend.style.visibility = '';
                });
            }
        }
    }
};