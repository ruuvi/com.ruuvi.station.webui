import React, { useEffect, useRef, useState } from "react";
import { Box, Flex, Switch } from "@chakra-ui/react";
import NetworkApi from "../../NetworkApi";

export default function NewsletterConsent({ t, language }) {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState(null);
    const pending = useRef(false);
    const active = useRef(false);

    useEffect(() => {
        active.current = true;
        let cancelled = false;
        new NetworkApi().getNewsletterSubscription().then(response => {
            if (!cancelled) setData(response.data);
        }).catch(() => {
            if (!cancelled) setData(null);
        }).finally(() => {
            if (!cancelled) setBusy(false);
        });
        return () => { cancelled = true; active.current = false; };
    }, []);

    const update = async (consent) => {
        if (pending.current || busy || data === null) return;
        pending.current = true;
        setBusy(true);
        setError(null);
        const api = new NetworkApi();
        try {
            const response = await api.setNewsletterSubscription(consent, language);
            if (active.current) setData(response.data);
        } catch {
            if (!active.current) return;
            setError("something_went_wrong");
            setData(null);
            if (data !== null) {
                // A failed POST may have committed. Read before allowing another save.
                try {
                    const response = await api.getNewsletterSubscription();
                    if (active.current) setData(response.data);
                } catch {
                    // Keep the switch disabled while consent is unknown.
                }
            }
        } finally {
            pending.current = false;
            if (active.current) setBusy(false);
        }
    };

    return (
        <Box mt={4}>
            <Flex align="center" justify="space-between" gap={3}>
                <Box fontFamily="mulish" fontWeight={800}>{t("newsletter_subscription")}</Box>
                <Flex align="center" gap={3}>
                    {!busy && data !== null && (
                        <Box role="status">{t(data.consent ? "on" : "off")}</Box>
                    )}
                    <Switch.Root size="md" colorPalette="ruuvi" checked={data?.consent ?? false}
                        disabled={busy || data === null} onCheckedChange={e => update(e.checked)}>
                        <Switch.HiddenInput aria-label={t("newsletter_subscription")} />
                        <Switch.Control />
                    </Switch.Root>
                </Flex>
            </Flex>
            {!busy && data?.status === "unconfirmed" && (
                <Box role="status" mt={2}>{t("newsletter_subscription_confirmation")}</Box>
            )}
            {error && data !== null && <Box role="alert" mt={2}>{t(error)}</Box>}
        </Box>
    );
}
