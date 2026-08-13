// Staging is normally opted into via localStorage, but /public-dev/ pages
// always point at the staging environment so public sensors can be tested
// there before the feature is live in production.
export function isStagingEnv() {
    return localStorage.getItem("env") === "staging" || window.location.pathname.startsWith("/public-dev/")
}
