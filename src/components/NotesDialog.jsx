import React, { useState, useEffect } from "react";
import {
    Button,
    Textarea,
    Progress,
    Text,
} from "@chakra-ui/react"
import { useTranslation } from 'react-i18next';
import NetworkApi from "../NetworkApi";
import notify from "../utils/notify";
import RDialog from "./RDialog";

const MAX_LENGTH = 1000;

export default function NotesDialog({ open, onClose, sensor, updateSensor }) {
    const { t } = useTranslation();
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && sensor) {
            setDescription(sensor.settings?.description || "");
        }
    }, [open, sensor?.sensor]); // eslint-disable-line react-hooks/exhaustive-deps

    const save = async () => {
        setLoading(true);
        try {
            let data = await new NetworkApi().updateSensorSetting(
                sensor.sensor,
                ["description"],
                [description]
            );
            if (!data || data.result !== "success") {
                notify.error(t(`UserApiError.${data?.code || "unknown"}`));
                return;
            }
            if (updateSensor) {
                const updatedSensor = {
                    ...sensor,
                    settings: {
                        ...(sensor.settings || {}),
                        description: description,
                    },
                };
                updateSensor(updatedSensor);
            }
            notify.success(t("successfully_saved"));
            onClose();
        } catch {
            notify.error(t("internet_connection_problem"));
        } finally {
            setLoading(false);
        }
    };

    const keyDown = (e) => {
        if (e.key === 'Enter' && e.metaKey) {
            if (!loading) save();
        }
    };

    return (
        <RDialog title={t("notes")} isOpen={open} onClose={onClose}>
            <Textarea
                autoFocus
                value={description}
                onChange={e => setDescription(e.target.value.substring(0, MAX_LENGTH))}
                onKeyDown={keyDown}
                rows={6}
                maxLength={MAX_LENGTH}
            />
            <Text fontSize="sm" color="gray.500" textAlign="right" mt={1}>
                {description.length}/{MAX_LENGTH}
            </Text>
            <div style={{ textAlign: "right" }}>
                <Button disabled={loading} onClick={save} mt="10px">{t("update")}</Button>
            </div>
            {loading && <Progress isIndeterminate={true} color="#e6f6f2" mt={4} />}
        </RDialog>
    );
}
