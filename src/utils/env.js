// /public/<mac> (production) or /public-dev/<mac> (staging); keep in sync with index.html
const PUBLIC_ROUTE = /^\/public(-dev)?\/[^/]+\/?$/

export function isPublicRoute(pathname = window.location.pathname) {
    return PUBLIC_ROUTE.test(pathname)
}

export function isPublicDevRoute(pathname = window.location.pathname) {
    return isPublicRoute(pathname) && pathname.startsWith("/public-dev/")
}

export function publicPathPrefix(staging) {
    return staging ? "/public-dev" : "/public"
}

// Public pages follow the environment in their path, not the localStorage opt-in
export function isStagingEnv() {
    if (isPublicRoute()) return isPublicDevRoute()
    return localStorage.getItem("env") === "staging"
}
