import React from "react";
import { useTranslation } from 'react-i18next';
import Settings from "../states/Settings";
import RDialog from "./RDialog";

const SettingsModal = ({ open, onClose, updateApp }) => {
    const { t } = useTranslation();
    return (
        <RDialog title={t("settings")} isOpen={open} onClose={onClose}>
            <Settings isModal updateApp={updateApp} />
        </RDialog>
    );
};

export default SettingsModal;