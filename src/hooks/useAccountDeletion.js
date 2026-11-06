import { useCallback, useEffect, useRef, useState } from "react";
import { verifyAccountDeletion } from "../utils/verifyAccountDeletion";

export function deletionNeedsAttention(progress) {
    return [progress?.history, progress?.notifications, progress?.overall].includes("needs_attention");
}

export default function useAccountDeletion({ token, environment }) {
    const initialStatus = !environment ? "invalidEnvironment" : token ? "checking" : "missing";
    const [state, setState] = useState({ status: initialStatus, progress: null });
    const request = useRef(null);
    const timer = useRef(null);
    const phase = useRef(initialStatus);
    const attempted = useRef(false);

    const stop = useCallback(() => {
        clearTimeout(timer.current);
        request.current?.abort();
        request.current = null;
    }, []);

    const run = useCallback(
        async function runRequest(action) {
            if (request.current) return;
            clearTimeout(timer.current);
            const controller = new AbortController();
            request.current = controller;
            const nextStatus = action === "confirm" ? "submitting" : "checking";
            if (action === "confirm") attempted.current = true;
            phase.current = nextStatus;
            setState((previous) => ({ ...previous, status: nextStatus }));
            try {
                const result = await verifyAccountDeletion(token, environment, action, controller.signal);
                if (request.current !== controller) return;
                const status = result.status === "pending" ? "ready" : result.status;
                phase.current = status;
                setState((previous) => ({
                    status,
                    progress: status === "completed" ? result : previous.progress,
                }));
                if (status === "processing" || status === "rate_limited") {
                    timer.current = setTimeout(() => runRequest(action), result.retryAfterMs);
                } else if (
                    status === "completed" &&
                    result.overall !== "completed" &&
                    !deletionNeedsAttention(result)
                ) {
                    timer.current = setTimeout(() => runRequest("status"), 10000);
                }
            } catch {
                if (request.current !== controller) return;
                phase.current = "error";
                setState((previous) => ({ ...previous, status: "error" }));
            } finally {
                if (request.current === controller) request.current = null;
            }
        },
        [token, environment],
    );

    useEffect(() => {
        if (token && environment) run("status");
        return stop;
    }, [token, environment, run, stop]);

    const confirm = () => {
        if (phase.current === "ready") run("confirm");
    };
    const retry = () => {
        // A failed confirmation can have committed. Always check before offering
        // another confirmation, and never describe an unknown outcome as cancelled.
        if (["error", "temporarily_failed"].includes(phase.current)) run("status");
    };
    const cancel = () => {
        if (phase.current !== "ready") return;
        stop();
        phase.current = attempted.current ? "unconfirmed" : "cancelled";
        setState({ status: phase.current, progress: null });
    };
    return { ...state, confirm, retry, cancel };
}
