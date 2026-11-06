export function getDeletionToken(search, hash = "") {
    const tokens = [
        ...new URLSearchParams(search).getAll("token"),
        ...new URLSearchParams(hash.replace(/^#/, "")).getAll("token"),
    ];
    // Ambiguous and empty links cannot identify an account for deletion.
    return tokens.length === 1 && tokens[0].trim() ? tokens[0] : null;
}

export function getDeletionEnvironment(search) {
    const environments = new URLSearchParams(search).getAll("env");
    // The link selects the backend, independently of the browser's session.
    if (environments.length === 0) return "production";
    return environments.length === 1 && environments[0] === "dev" ? "dev" : null;
}

export async function verifyAccountDeletion(token, environment = "production") {
    if (typeof token !== "string" || !token.trim()) return "invalid";

    const origin = environment === "dev" ? "https://testnet.ruuvi.com"
        : environment === "production" ? "https://network.ruuvi.com" : null;
    if (!origin) return "invalid";
    const url = new URL("/verify-delete", origin);
    url.searchParams.set("token", token);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
        // This operation belongs exclusively to the email token. In particular,
        // do not use NetworkApi's session auth, environment, or logout handling.
        const response = await fetch(url.href, {
            method: "GET",
            credentials: "omit",
            cache: "no-store",
            referrerPolicy: "no-referrer",
            redirect: "error",
            signal: controller.signal,
        });

        if (response.status === 403) return "invalid";
        if (response.status !== 200) throw new Error("Account deletion could not be confirmed.");

        // The API confirms that deletion has STARTED; its body may be empty.
        return "started";
    } finally {
        clearTimeout(timeout);
    }
}
