import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import Settings from "../states/Settings";
import RDialog from "./RDialog";

class SettingsModal extends Component {
    render() {
        var { t } = this.props;
        return (
            <RDialog title={t("settings")} isOpen={this.props.open} onClose={this.props.onClose}>
                <Settings isModal />
            </RDialog>
        )
    }
}

export default withTranslation()(SettingsModal);