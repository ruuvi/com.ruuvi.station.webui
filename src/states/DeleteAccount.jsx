import React, { useEffect, useRef, useState } from "react";
import {
    FiAlertTriangle,
    FiArrowRight,
    FiArrowUpRight,
    FiCheck,
    FiHelpCircle,
    FiLink,
    FiRadio,
    FiShare2,
    FiTrash2,
    FiUser,
} from "react-icons/fi";
import logo from "../img/ruuvi-vector-logo.svg";
import mascot from "../img/with-phone-serious-500.png";
import { getDeletionToken, verifyAccountDeletion } from "../utils/verifyAccountDeletion";
import "./DeleteAccount.css";

const outcomes = {
    started: {
        icon: FiCheck,
        title: "Account deletion has started",
        description:
            "We’ve received your confirmation and started deleting the Ruuvi account associated with your email link.",
        detail: "Your sensor sharing, sensor claims and account settings will be removed. You can now close this page.",
    },
    missing: {
        icon: FiLink,
        title: "Your deletion link is incomplete",
        description: "Please open the full account deletion link from your email.",
        detail: "If you can’t find it, request a new deletion email from your Ruuvi account settings. You don’t need to sign in to use the link.",
    },
    invalid: {
        icon: FiLink,
        title: "This link is no longer valid",
        description: "Your deletion link may have expired or already been used.",
        detail: "To continue, request a new deletion email from your Ruuvi account settings and open the latest link. If you’ve already confirmed deletion, no further action is needed.",
    },
    cancelled: {
        icon: FiCheck,
        title: "No changes made",
        description:
            "You haven’t confirmed account deletion. You can safely close this page or return to Ruuvi Station.",
        detail: "Thanks for being part of Ruuvi.",
    },
    unconfirmed: {
        icon: FiHelpCircle,
        title: "Deletion status unconfirmed",
        description: "We couldn’t confirm whether your deletion request was received.",
        detail: "Deletion may already be in progress. Please contact our team if you need help checking.",
    },
};

function Outcome({ status, headingRef }) {
    const { icon: Icon, title, description, detail } = outcomes[status];
    return (
        <div className="delete-account-outcome">
            <span className={`delete-account-status-icon delete-account-status-icon--${status}`}>
                <Icon aria-hidden="true" />
            </span>
            <p className="delete-account-eyebrow">YOUR RUUVI ACCOUNT</p>
            <h1 id="delete-account-title" ref={headingRef} tabIndex={-1}>
                {title}
            </h1>
            <p className="delete-account-intro">{description}</p>
            <p className="delete-account-outcome-detail">{detail}</p>
            <a className="delete-account-button delete-account-button--return" href="/" rel="noreferrer">
                Back to Ruuvi Station <FiArrowRight aria-hidden="true" />
            </a>
            <p className="delete-account-help">
                Need a hand? <a href="mailto:support@ruuvi.com">Contact our team</a>
            </p>
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
            <header className="delete-account-header">
                <a className="delete-account-brand" href="/" aria-label="Ruuvi Station" rel="noreferrer">
                    <img src={logo} alt="Ruuvi" width="104" height="28" />
                    <span>Station</span>
                </a>
                <a className="delete-account-support" href="mailto:support@ruuvi.com">
                    <FiHelpCircle aria-hidden="true" /> <span>Here to help</span>
                </a>
            </header>

            <main className="delete-account-main">
                <section className="delete-account-card" aria-labelledby="delete-account-title">
                    <aside className="delete-account-aside">
                        <div className="delete-account-aside-copy">
                            <span className="delete-account-aside-line" aria-hidden="true" />
                            <h2>
                                A little pause.
                                <br />A thoughtful goodbye.
                            </h2>
                            <p>
                                Whatever comes next,
                                <br />
                                thanks for being part of Ruuvi.
                            </p>
                        </div>
                        <div className="delete-account-mascot">
                            <div className="delete-account-mascot-circle" aria-hidden="true" />
                            <img src={mascot} alt="The Ruuvi beaver holding a phone" width="500" height="466" />
                        </div>
                        <span className="delete-account-aside-note">Little sensors. Meaningful moments.</span>
                    </aside>

                    <div className="delete-account-content">
                        {outcome ? (
                            <Outcome status={status} headingRef={headingRef} />
                        ) : (
                            <>
                                <p className="delete-account-eyebrow">YOUR RUUVI ACCOUNT</p>
                                <h1 id="delete-account-title">Delete your account?</h1>
                                <p className="delete-account-intro">
                                    Before you go, here’s what will happen to the Ruuvi account associated with your
                                    email link.
                                </p>

                                <ul className="delete-account-consequences">
                                    <li>
                                        <span className="delete-account-list-icon">
                                            <FiShare2 aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h2>Sensor sharing will stop</h2>
                                            <p>Your sensors will no longer be shared with others.</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className="delete-account-list-icon">
                                            <FiRadio aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h2>Shared sensors will be removed</h2>
                                            <p>You’ll lose access to sensors shared with you.</p>
                                        </div>
                                    </li>
                                    <li>
                                        <span className="delete-account-list-icon">
                                            <FiUser aria-hidden="true" />
                                        </span>
                                        <div>
                                            <h2>Your account data will be deleted</h2>
                                            <p>This includes your sensor claims and settings.</p>
                                        </div>
                                    </li>
                                </ul>

                                <div className="delete-account-warning" id="delete-account-warning">
                                    <FiAlertTriangle aria-hidden="true" />
                                    <div>
                                        <strong>This can’t be undone</strong>
                                        <p>Account deletion is permanent.</p>
                                    </div>
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

                                    {status === "error" && (
                                        <div className="delete-account-error" role="alert" ref={errorRef} tabIndex={-1}>
                                            <strong>We couldn’t confirm deletion</strong>
                                            <p>
                                                The request may not have reached us. Please try again, or{" "}
                                                <a href="mailto:support@ruuvi.com">contact support</a> if this
                                                continues.
                                            </p>
                                        </div>
                                    )}

                                    <div className="delete-account-actions">
                                        <button
                                            className="delete-account-button delete-account-button--delete"
                                            type="submit"
                                            disabled={!confirmed || isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <span className="delete-account-spinner" aria-hidden="true" />
                                            ) : (
                                                <FiTrash2 aria-hidden="true" />
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
                <p className="delete-account-reassurance">A little care for your data. Always.</p>
            </main>

            <footer className="delete-account-footer">
                <span>© {new Date().getFullYear()} Ruuvi Innovations Ltd.</span>
                <a href="https://ruuvi.com" rel="noreferrer">
                    Discover Ruuvi <FiArrowUpRight aria-hidden="true" />
                </a>
            </footer>
        </div>
    );
}
