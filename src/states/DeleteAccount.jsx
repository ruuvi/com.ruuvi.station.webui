import React, { useEffect, useRef, useState } from "react";
import { FiCheck, FiLink, FiX } from "react-icons/fi";
import mascot from "../img/with-phone-serious-500.png";
import useAccountDeletion, { deletionNeedsAttention } from "../hooks/useAccountDeletion";
import "./DeleteAccount.css";

const outcomes = {
    missing: {
        icon: FiLink,
        title: "Your deletion link is incomplete",
        description: "Please open the full account deletion link from your email.",
        detail: "If you can’t find it, request a new deletion email from your Ruuvi account settings. You don’t need to sign in to use the link.",
    },
    invalid: {
        icon: FiLink,
        title: "This link is no longer valid",
        description: "Your deletion link was not found or has been replaced by a newer link.",
        detail: "To continue, request a new deletion email from your Ruuvi account settings and open the latest link. If you’ve already confirmed deletion, no further action is needed.",
    },
    invalidEnvironment: {
        icon: FiLink,
        title: "Your deletion link has an invalid environment",
        description: "We couldn’t determine where to send your deletion request.",
        detail: "Please open the original link from your email or request a new deletion email from your account settings.",
    },
    cancelled: {
        icon: FiCheck,
        title: "No changes made",
        description:
            "You haven’t confirmed account deletion. You can safely close this page or return to Ruuvi Station.",
        detail: "Thanks for being part of Ruuvi.",
    },
    unconfirmed: {
        icon: FiLink,
        title: "Deletion status unconfirmed",
        description: "Your earlier confirmation may still be processing.",
        detail: "Closing this page does not cancel a submitted deletion. Reopen your email link to check progress, or contact support.",
    },
    expired: {
        icon: FiLink,
        title: "Your deletion link has expired",
        description: "This link expired before account deletion was confirmed.",
        detail: "Request a new deletion email from your Ruuvi account settings and open the latest link.",
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

function Progress({ progress, status, headingRef }) {
    const attention = deletionNeedsAttention(progress);
    const finished = progress.overall === "completed" && !attention;
    const labels = { in_progress: "In progress", completed: "Completed", needs_attention: "Needs support" };
    return (
        <div className="delete-account-outcome">
            <h1 id="delete-account-title" ref={headingRef} tabIndex={-1}>
                {attention
                    ? "Cleanup needs attention"
                    : finished
                      ? "Account deletion completed"
                      : "Your account is deleted"}
            </h1>
            <p className="delete-account-intro">Your account, sensor claims, shares and settings have been removed.</p>
            <dl className="delete-account-progress" aria-live="polite">
                <div>
                    <dt>Account</dt>
                    <dd>Deleted</dd>
                </div>
                <div>
                    <dt>Measurement history</dt>
                    <dd>{labels[progress.history]}</dd>
                </div>
                <div>
                    <dt>Share notifications</dt>
                    <dd>{labels[progress.notifications]}</dd>
                </div>
                <div>
                    <dt>All cleanup</dt>
                    <dd>{labels[progress.overall]}</dd>
                </div>
            </dl>
            <p className="delete-account-outcome-detail">
                {attention ? (
                    <>
                        Some cleanup could not finish. Please{" "}
                        <a href="mailto:support@ruuvi.com">contact Ruuvi support</a>.
                    </>
                ) : finished ? (
                    "All cleanup is complete. You can close this page."
                ) : (
                    "Cleanup continues in the background and may take a few days. You can close it and reopen your email link later."
                )}
            </p>
            {!attention && !finished && status === "completed" && (
                <p className="delete-account-outcome-detail">This page checks progress every 10 seconds.</p>
            )}
            <p className="delete-account-outcome-detail">
                Completed share notifications have been accepted by the email service; delivery to recipients is not
                confirmed.
            </p>
            <a className="delete-account-button delete-account-button--return" href="/" rel="noreferrer">
                Back to Ruuvi Station
            </a>
        </div>
    );
}

function RequestStatus({ status, retry, hasProgress, headingRef }) {
    const failed = status === "error" || status === "temporarily_failed";
    const messages = {
        checking: ["Checking deletion status…", "Please wait while we check your email link."],
        processing: [
            "Processing your confirmation…",
            "Another confirmation is being processed. We’ll try again shortly.",
        ],
        rate_limited: [
            "Please wait before trying again",
            "Too many requests were made. We’ll retry automatically once you can continue.",
        ],
        temporarily_failed: [
            "Please try again later",
            "The service is temporarily unavailable. Check the status again before continuing.",
        ],
        error: [
            "Deletion status unconfirmed",
            "We couldn’t check the latest status. If you confirmed deletion, it may already be in progress. Check again or contact support.",
        ],
    };
    const message = messages[status];
    if (!message || (hasProgress && status === "checking")) return null;
    return (
        <div className={failed ? "delete-account-error" : "delete-account-outcome"} role={failed ? "alert" : "status"}>
            {hasProgress ? (
                <strong>{message[0]}</strong>
            ) : (
                <h1 id="delete-account-title" ref={headingRef} tabIndex={-1}>
                    {message[0]}
                </h1>
            )}
            <p className="delete-account-outcome-detail">{message[1]}</p>
            {failed && (
                <button className="delete-account-button delete-account-button--return" onClick={retry}>
                    Check status again
                </button>
            )}
        </div>
    );
}

export default function DeleteAccount({ link }) {
    const { status, progress, confirm, retry, cancel } = useAccountDeletion(link);
    const [confirmed, setConfirmed] = useState(false);
    const headingRef = useRef(null);
    const isSubmitting = status === "submitting";
    const outcomeStatus = status === "invalid_request" ? "invalid" : status;
    const outcome = outcomes[outcomeStatus];
    const view = progress ? progress.overall : status;

    useEffect(() => {
        headingRef.current?.focus();
    }, [view]);

    function handleDelete(event) {
        event.preventDefault();
        if (confirmed) confirm();
    }

    return (
        <div className="delete-account-page">
            <main className="delete-account-main">
                <section aria-labelledby="delete-account-title">
                    <div className="delete-account-content">
                        {link.environment === "dev" && (
                            <p className="delete-account-environment">Development environment</p>
                        )}
                        {outcome ? (
                            <Outcome status={outcomeStatus} headingRef={headingRef} />
                        ) : progress ? (
                            <>
                                <Progress progress={progress} status={status} headingRef={headingRef} />
                                <RequestStatus status={status} retry={retry} hasProgress />
                            </>
                        ) : !["ready", "submitting"].includes(status) ? (
                            <RequestStatus status={status} retry={retry} headingRef={headingRef} />
                        ) : (
                            <>
                                <h1 id="delete-account-title" ref={headingRef} tabIndex={-1}>
                                    Delete your account?
                                </h1>
                                <p className="delete-account-intro">
                                    Before you go, here’s what will happen to the Ruuvi account associated with your
                                    email link.
                                </p>
                                <img
                                    className="delete-account-mascot"
                                    src={mascot}
                                    alt="The Ruuvi beaver holding a phone"
                                    width="500"
                                    height="466"
                                />
                                <ul className="delete-account-consequences" role="list">
                                    <li>
                                        <span className="delete-account-list-icon">
                                            <FiX aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h2>Sensor sharing will stop</h2>
                                            <p>Your sensors will no longer be shared with others.</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className="delete-account-list-icon">
                                            <FiX aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h2>Shared sensors will be removed</h2>
                                            <p>You’ll lose access to sensors shared with you.</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className="delete-account-list-icon">
                                            <FiX aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h2>Your account data will be deleted</h2>
                                            <p>
                                                This includes your sensor claims and settings. Measurement history for
                                                sensors you own will also be deleted from the cloud.
                                            </p>
                                        </div>
                                    </li>
                                </ul>
                                <div className="delete-account-warning" id="delete-account-warning">
                                    <strong>This can’t be undone</strong>
                                    <p>Account deletion is permanent.</p>
                                </div>

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
                                        <span>I understand and want to permanently delete this account.</span>
                                    </label>

                                    <div className="delete-account-actions">
                                        <button
                                            className="delete-account-button delete-account-button--delete"
                                            type="submit"
                                            disabled={!confirmed || isSubmitting}
                                        >
                                            {isSubmitting && (
                                                <span className="delete-account-spinner" aria-hidden="true" />
                                            )}
                                            {isSubmitting ? "Deleting account…" : "Delete account"}
                                        </button>
                                        <button
                                            className="delete-account-cancel"
                                            type="button"
                                            disabled={isSubmitting}
                                            onClick={cancel}
                                        >
                                            Cancel
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
