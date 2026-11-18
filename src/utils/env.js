// /public/<mac> (production) or /public-dev/<mac> (staging); keep in sync with index.html
const PUBLIC_ROUTE = /^\/public(-dev)?\/[^/]+\/?$/

export function isDemoRoute(pathname = window.location.pathname) {
    return /^\/demo(?:\/|$)/.test(pathname)
}

// Use for full-page links; React Router adds its basename to in-app navigation.
export function appPath(path = "/") {
    return isDemoRoute() ? `/demo${path}` : path
}

export function isPublicRoute(pathname = window.location.pathname) {
    return PUBLIC_ROUTE.test(isDemoRoute(pathname) ? pathname.slice(5) : pathname)
}

export function isPublicDevRoute(pathname = window.location.pathname) {
    return isPublicRoute(pathname) && pathname.startsWith("/public-dev/")
}

export function publicPathPrefix(staging) {
    return appPath(staging ? "/public-dev" : "/public")
}

// Public pages follow the environment in their path, not the localStorage opt-in
export function isStagingEnv() {
    if (isDemoRoute()) return false
    if (isPublicRoute()) return isPublicDevRoute()
    return localStorage.getItem("env") === "staging"
}
