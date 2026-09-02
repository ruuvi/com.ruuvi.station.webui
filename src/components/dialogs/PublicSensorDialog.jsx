import React, { useEffect, useState } from "react";
import {
    Button,
    Switch,
    Box,
    Flex,
    Text,
    Spinner,
} from "@chakra-ui/react";
import { withTranslation } from 'react-i18next';
import QRCode from "qrcode";
import { MdContentCopy, MdCheck, MdFileDownload } from "react-icons/md";
import NetworkApi from "../../NetworkApi";
import notify from "../../utils/notify";
import RDialog from "./RDialog";

const PublicSensorDialog = ({ open, onClose, t, sensor, updateSensor }) => {
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (open) setIsPublic(!!sensor?.public);
    }, [open, sensor]);

    // the link must target the environment the sensor was made public in
    const publicPath = new NetworkApi().isStaging() ? "/public-dev" : "/public";
    const publicUrl = `${window.location.origin}${publicPath}/${sensor?.sensor}`;

    useEffect(() => {
        let active = true;
        if (open && isPublic) {
            QRCode.toDataURL(publicUrl, {
                width: 256,
                margin: 2,
                color: { dark: "#000000", light: "#ffffff" },
                errorCorrectionLevel: "M",
            }).then(url => {
                if (active) setQrCodeDataUrl(url);
            }).catch(err => {
                console.error("Failed to generate QR code", err);
            });
        }
        return () => { active = false; };
    }, [open, isPublic, publicUrl]);

    const setPublic = (value) => {
        setIsPublic(value);
        setSaving(true);
        new NetworkApi().updateSensorData(sensor.sensor, { public: value }, resp => {
            setSaving(false);
            if (resp.result === "success") {
                notify.success(t("successfully_saved"));
                if (updateSensor) updateSensor({ ...sensor, public: value });
            } else {
                setIsPublic(!value);
                notify.error(t(`UserApiError.${resp.code}`));
            }
        });
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(publicUrl);
            setCopied(true);
            notify.success(t("link_copied"));
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            notify.error(t("copy_link_failed"));
        }
    };

    const downloadQr = () => {
        if (!qrCodeDataUrl) return;
        const filename = `${(sensor?.name || "sensor").replace(/[^a-zA-Z0-9_-]/g, "_")}_qr.png`;
        const a = document.createElement("a");
        a.href = qrCodeDataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <RDialog title={t("make_public")} isOpen={open} onClose={onClose} size="lg">
            <Box mb={4}>
                <Text fontSize="sm">
                    {t("make_public_description")}
                </Text>
            </Box>
            <Box mb={4}>
                <Flex justify="space-between" align="center">
                    <Box>
                        <Text fontWeight="bold" fontSize="md">
                            {t("public_sensor")}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                            {t("public_sensor_description")}
                        </Text>
                    </Box>
                    <Switch.Root
                        size="md"
                        checked={isPublic}
                        disabled={saving}
                        colorPalette="ruuvi"
                        onCheckedChange={e => setPublic(e.checked)}
                    >
                        <Switch.HiddenInput />
                        <Switch.Control />
                    </Switch.Root>
                </Flex>
            </Box>
            {isPublic && (
                <Box mb={4}>
                    <Box
                        display="flex"
                        flexDirection="column"
                        alignItems="center"
                        justifyContent="center"
                        my={4}
                        p={4}
                        borderRadius="md"
                        bg="blackAlpha.50"
                        _dark={{ bg: "whiteAlpha.50" }}
                    >
                        <Text fontWeight="bold" fontSize="sm" mb={3} color="gray.600" _dark={{ color: "gray.300" }}>
                            {t("qr_code")}
                        </Text>
                        <Box
                            p={3}
                            bg="white"
                            borderRadius="lg"
                            boxShadow="sm"
                            border="1px solid"
                            borderColor="gray.200"
                        >
                            {qrCodeDataUrl ? (
                                <img
                                    src={qrCodeDataUrl}
                                    alt={t("qr_code")}
                                    width={160}
                                    height={160}
                                    style={{ display: "block" }}
                                />
                            ) : (
                                <Box width="160px" height="160px" display="flex" alignItems="center" justifyContent="center">
                                    <Spinner size="lg" />
                                </Box>
                            )}
                        </Box>
                        <Button
                            size="xs"
                            variant="outline"
                            mt={3}
                            onClick={downloadQr}
                            disabled={!qrCodeDataUrl}
                        >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <MdFileDownload />
                                {t("download_qr")}
                            </span>
                        </Button>
                    </Box>

                    <Text fontWeight="bold" fontSize="md" mb={2}>
                        {t("public_sensor_url")}
                    </Text>
                    <Flex gap={2} align="center">
                        <Box
                            flex="1"
                            p={2.5}
                            borderRadius={6}
                            bg="whiteAlpha.200"
                            border="1px"
                            borderColor="gray.200"
                            overflow="hidden"
                        >
                            <Text
                                fontSize="sm"
                                userSelect="all"
                                style={{
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                }}
                            >
                                {publicUrl}
                            </Text>
                        </Box>
                        <Button
                            size="sm"
                            onClick={copyLink}
                            colorPalette="ruuvi"
                        >
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                {copied ? <MdCheck /> : <MdContentCopy />}
                                {copied ? t("copied") : t("copy_link")}
                            </span>
                        </Button>
                    </Flex>
                </Box>
            )}
            <Flex justify="flex-end" gap={3} mt={6}>
                <Button onClick={onClose}>
                    {t("close")}
                </Button>
            </Flex>
        </RDialog>
    );
};

export default withTranslation()(PublicSensorDialog);
