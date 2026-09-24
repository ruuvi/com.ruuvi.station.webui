import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiHelpCircle, FiLink } from "react-icons/fi";
import mascot from "../img/with-phone-serious-500.png";
import { getDeletionToken, verifyAccountDeletion } from "../utils/verifyAccountDeletion";
import "./DeleteAccount.css";

const outcomes = {
    started: {
        icon: FiCheck,
        title: "Account deletion has started",
        description: "We’re deleting the Ruuvi account associated with your email link.",
        detail: "You can now close this page.",
    },
    missing: {
        icon: FiLink,
        title: "Your deletion link is incomplete",
        description: "Please open the full account deletion link from your email.",
        detail: "Can’t find it? Request a new email from your Ruuvi account settings.",
    },
    invalid: {
        icon: FiLink,
        title: "This link is no longer valid",
        description: "Your deletion link may have expired or already been used.",
        detail: "Request a new email from your account settings. Already confirmed deletion? No further action is needed.",
    },
    cancelled: {
        icon: FiCheck,
        title: "No changes made",
        description: "Your account hasn’t been changed. You can close this page.",
        detail: "Thanks for being part of Ruuvi.",
    },
    unconfirmed: {
        icon: FiHelpCircle,
        title: "Deletion status unconfirmed",
        description: "We couldn’t confirm whether your deletion request was received.",
        detail: "Deletion may already be in progress. Contact support to check.",
    },
};

function Outcome({ status, headingRef }) {
    const { icon: Icon, title, description, detail } = outcomes[status];
    return (
        <div className="delete-account-outcome">
            <span className={`delete-account-status-icon delete-account-status-icon--${status}`}>
                <Icon aria-hidden="true" />
            </span>
            <h1 id="delete-account-title" ref={headingRef} tabIndex={-1}>
                {title}
            </h1>
            <p className="delete-account-intro">{description}</p>
            <p className="delete-account-outcome-detail">{detail}</p>
            <a className="delete-account-button delete-account-button--return" href="/" rel="noreferrer">
                Back to Ruuvi Station
            </a>
        </div>
    );
}

export default function DeleteAccount() {
    const [token] = useState(() => getDeletionToken(window.location.search));
    const [status, setStatus] = useState(token ? "ready" : "missing");
    const [confirmed, setConfirmed] = useState(false);
    const submitting = useRef(false);
    const headingRef = useRef(null);
    const errorRef = useRef(null);
    const isSubmitting = status === "submitting";
    const outcome = outcomes[status];

    useEffect(() => {
        if (outcomes[status]) headingRef.current?.focus();
        if (status === "error") errorRef.current?.focus();
    }, [status]);

    async function handleDelete(event) {
        event.preventDefault();
        if (!token || !confirmed || submitting.current || outcome) return;
        // Lock immediately, including clicks before React commits the disabled state.
        submitting.current = true;
        setStatus("submitting");
        try {
            setStatus(await verifyAccountDeletion(token));
        } catch {
            setStatus("error");
        } finally {
            submitting.current = false;
        }
    }

    return (
        <div className="delete-account-page">
            <main className="delete-account-main">
                <section aria-labelledby="delete-account-title">
                    <div className="delete-account-content">
                        {outcome ? (
                            <Outcome status={status} headingRef={headingRef} />
                        ) : (
                            <>
                                <h1 id="delete-account-title">Delete account?</h1>
                                <p className="delete-account-intro">Time to say goodbye to your Ruuvi account.</p>
                                <img
                                    className="delete-account-mascot"
                                    src={mascot}
                                    alt="The Ruuvi beaver holding a phone"
                                    width="500"
                                    height="466"
                                />
                                <p className="delete-account-summary">
                                    Deleting the account linked to this email removes your sensor claims and settings.
                                    Sensor sharing stops, and you’ll lose access to sensors shared with you.
                                </p>
                                <p className="delete-account-warning" id="delete-account-warning">
                                    <strong>This is permanent and can’t be undone.</strong>
                                </p>

                                <form onSubmit={handleDelete} aria-busy={isSubmitting}>
                                    <label className="delete-account-confirmation">
                                        <input
                                            type="checkbox"
                                            checked={confirmed}
                                            onChange={(event) => setConfirmed(event.target.checked)}
                                            disabled={isSubmitting}
                                            aria-describedby="delete-account-warning"
                                            required
                                        />
                                        <span>I understand. Permanently delete my account.</span>
                                    </label>

                                    {status === "error" && (
                                        <div className="delete-account-error" role="alert" ref={errorRef} tabIndex={-1}>
                                            <strong>We couldn’t confirm deletion</strong>
                                            <p>
                                                Please try again or{" "}
                                                <a href="mailto:support@ruuvi.com">contact support</a>.
                                            </p>
                                        </div>
                                    )}

                                    <div className="delete-account-actions">
                                        <button
                                            className="delete-account-button delete-account-button--delete"
                                            type="submit"
                                            disabled={!confirmed || isSubmitting}
                                        >
                                            {isSubmitting && (
                                                <span className="delete-account-spinner" aria-hidden="true" />
                                            )}
                                            {isSubmitting
                                                ? "Deleting account…"
                                                : status === "error"
                                                  ? "Try again"
                                                  : "Delete account"}
                                        </button>
                                        <button
                                            className="delete-account-cancel"
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={() => setStatus(status === "error" ? "unconfirmed" : "cancelled")}
                                        >
                                            {status === "error" ? "Close" : "Cancel"}
                                        </button>
                                    </div>
                                    <span className="delete-account-sr-only" role="status">
                                        {isSubmitting ? "Starting account deletion. Please wait." : ""}
                                    </span>
                                </form>
                            </>
                        )}
                    </div>
                </section>
            </main>

            <footer className="delete-account-footer">
                <a href="mailto:support@ruuvi.com">Contact support</a>
            </footer>
        </div>
    );
}
