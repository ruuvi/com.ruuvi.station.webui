import React, { Component } from "react";
import logger from "../utils/logger";
import NetworkApi from "../NetworkApi";
import RadioInput from "../components/common/RadioInput";
import {
    Box,
    Progress,
    HStack,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
} from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import NavClose from "../components/common/NavClose";
import notify from "../utils/notify";
import LanguageMenu from '../components/menus/LanguageMenu';
import Store from "../Store";
import ResolutionSettings from "../components/settings/ResolutionSettings";
import UnitSettings from "../components/settings/UnitSettings";

const header = {
    fontFamily: "montserrat",
    fontSize: "24px",
    fontWeight: 800,
}

const accordionTitle = {
    fontFamily: "montserrat",
    fontSize: "16px",
    fontWeight: 800,
}

const accordionButton = {
    paddingTop: 12,
    paddingBottom: 12,
}

const accordionPanel = {
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: "transparent",
}

const boolOpt = [
    { value: true, label: "yes" },
    { value: false, label: "no" },
]

class Settings extends Component {
    constructor(props) {
        super(props)
        this.state = {
            loading: true,
            settings: {
                UNIT_HUMIDITY: "0",
                UNIT_TEMPERATURE: "C",
                UNIT_PRESSURE: "1",
                ACCURACY_HUMIDITY: "2",
                ACCURACY_HUMIDITY_RELATIVE: "2",
                ACCURACY_HUMIDITY_ABSOLUTE: "2",
                ACCURACY_HUMIDITY_DEW_POINT: "2",
                ACCURACY_PRESSURE: "2",
                ACCURACY_TEMPERATURE: "2",
                ACCURACY_PM: "1",
                ACCURACY_ACCELERATION: "3",
                ACCURACY_VOLTAGE: "2"
            },
            CHART_DRAW_DOTS: Store.getGraphDrawDots(),
            savingSettings: [],
            savingSettingsStarted: {},
        }
    }
    componentDidMount() {
        new NetworkApi().getSettings(data => {
            if (data.result === "success") {
                var settings = this.state.settings;
                settings = { ...settings, ...data.data.settings };
                this.setState({ ...this.state, settings: settings, loading: false });
            } else {
                notify.error(this.props.t(`UserApiError.${data.result.code}`))
            }
        })
    }
    updateSetting(key, value) {
        const prevValue = this.state.settings[key]; // keep original to allow revert
        const settings = { ...this.state.settings, [key]: value };
        const saving = this.state.savingSettings.includes(key) ? this.state.savingSettings : [...this.state.savingSettings, key];
        const savingSettingsStarted = { ...this.state.savingSettingsStarted, [key]: Date.now() };
        this.setState({ ...this.state, settings, savingSettings: saving, savingSettingsStarted });

        const clearSaving = () => {
            const startedAt = this.state.savingSettingsStarted[key] || Date.now();
            const elapsed = Date.now() - startedAt;
            const remaining = 1000 - elapsed; // ensure at least 1s loading time
            const doClear = () => this.setState(prev => ({
                ...prev,
                savingSettings: prev.savingSettings.filter(x => x !== key),
                savingSettingsStarted: Object.fromEntries(Object.entries(prev.savingSettingsStarted).filter(([k]) => k !== key))
            }));
            if (remaining > 0) {
                setTimeout(doClear, remaining);
            } else {
                doClear();
            }
        };

        const revert = () => {
            this.setState(prev => ({
                ...prev,
                settings: { ...prev.settings, [key]: prevValue }
            }));
        }

        new NetworkApi().setSetting(key, value, b => {
            if (b.result === "success") {
                notify.success(this.props.t("successfully_saved"));
                clearSaving();
                new NetworkApi().getSettings(settings => {
                    if (settings.result === "success") {
                        localStorage.setItem("settings", JSON.stringify(settings.data.settings));
                        if (this.props.updateApp) this.props.updateApp();
                    }
                });
            } else if (b.result === "error") {
                notify.error(`UserApiError.${this.props.t(b.code)}`);
                revert();
                clearSaving();
            }
        }, error => {
            logger.error(error);
            notify.error(this.props.t("something_went_wrong"));
            revert();
            clearSaving();
        });
    }
    updateLocalSetting(key, value) {
        if (key === "CHART_DRAW_DOTS") {
            Store.setGraphDrawDots(value)
            this.setState({ ...this.state, CHART_DRAW_DOTS: value })
        }
        if (this.props.updateUI) this.props.updateUI()
    }
    cloudBoolValue(value) {
        if (value === undefined) return false
        return JSON.parse(value) ? true : false
    }
    render() {
        // in the modal, bleed the accordion through the ModalBody padding (24px)
        // so the rows and dividers span the full dialog width; the same padding
        // is applied inside the button/panel to keep the content aligned.
        // vertically, counter the ModalBody bottom padding (8px) + its mb="3"
        // (12px, set in RDialog) so the accordion sits flush with the dialog edge
        const accordionBleed = this.props.isModal ? -6 : 0;
        const accordionBleedBottom = this.props.isModal ? -5 : 0;
        const accordionPad = this.props.isModal ? 24 : 0;
        const accordionButtonStyle = { ...accordionButton, paddingLeft: accordionPad, paddingRight: accordionPad };
        const accordionPanelStyle = { ...accordionPanel, paddingLeft: accordionPad, paddingRight: accordionPad };

        var content = <>
            {this.state.loading ? (
                <>
                    <Progress isIndeterminate={true} colorScheme="primaryScheme" />
                </>
            ) : (
                <>
                    <Box fontSize="sm" mb={4} opacity={0.7}>
                        {this.props.t("settings_introduction")}
                    </Box>
                    <LanguageMenu onChange={v => this.updateSetting("PROFILE_LANGUAGE_CODE", v)} loading={this.state.savingSettings.indexOf("PROFILE_LANGUAGE_CODE") !== -1} />
                    <br />
                    <RadioInput label={"settings_chart_draw_dots"} value={this.state.CHART_DRAW_DOTS} options={boolOpt} onChange={v => this.updateLocalSetting("CHART_DRAW_DOTS", JSON.parse(v))} />
                    <br />
                    <RadioInput label={"settings_email_alerts"} value={!this.cloudBoolValue(this.state.settings.DISABLE_EMAIL_NOTIFICATIONS)} options={boolOpt} onChange={v => this.updateSetting("DISABLE_EMAIL_NOTIFICATIONS", JSON.parse(v) ? "0" : "1")} loading={this.state.savingSettings.indexOf("DISABLE_EMAIL_NOTIFICATIONS") !== -1} />
                    <br />
                    <RadioInput label={"settings_mobile_push_alerts"} value={!this.cloudBoolValue(this.state.settings.DISABLE_PUSH_NOTIFICATIONS)} options={boolOpt} onChange={v => this.updateSetting("DISABLE_PUSH_NOTIFICATIONS", JSON.parse(v) ? "0" : "1")} loading={this.state.savingSettings.indexOf("DISABLE_PUSH_NOTIFICATIONS") !== -1} />
                    <br /><br />
                    <Box mx={accordionBleed} mb={accordionBleedBottom} borderBottomRadius={this.props.isModal ? "md" : 0} overflow="hidden">
                        <Accordion allowMultiple>
                            <AccordionItem border="none">
                                <AccordionButton style={accordionButtonStyle} _hover={{}}>
                                    <Box flex="1" textAlign="left" style={accordionTitle}>
                                        {this.props.t("unit_settings")}
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                                <AccordionPanel style={accordionPanelStyle}>
                                    <UnitSettings settings={this.state.settings} savingSettings={this.state.savingSettings} updateSetting={(k, v) => this.updateSetting(k, v)} />
                                </AccordionPanel>
                            </AccordionItem>
                            <AccordionItem border="none">
                                <AccordionButton style={accordionButtonStyle} _hover={{}}>
                                    <Box flex="1" textAlign="left" style={accordionTitle}>
                                        {this.props.t("resolution_settings")}
                                    </Box>
                                    <AccordionIcon />
                                </AccordionButton>
                                <AccordionPanel style={accordionPanelStyle}>
                                    <ResolutionSettings settings={this.state.settings} savingSettings={this.state.savingSettings} updateSetting={(k, v) => this.updateSetting(k, v)} />
                                </AccordionPanel>
                            </AccordionItem>
                        </Accordion>
                    </Box>
                </>
            )}
        </>

        if (this.props.isModal) return content

        return (
            <Box marginTop="36px" marginLeft={{ base: "10px", md: "20px", lg: "50px" }} marginRight={{ base: "10px", md: "20px", lg: "50px" }}>
                <Box borderWidth="1px" borderRadius="lg" overflow="hidden" pb={{ base: "15px", md: "35px" }} pt={{ base: "15px", md: "35px" }} pl={{ base: "15px", md: "35px" }} pr={{ base: "15px", md: "35px" }} style={{ backgroundColor: "white" }}>
                    <HStack alignItems="start">
                        <span style={{ ...header, width: "65%" }}>
                            {this.props.t("settings")}
                        </span>
                        <span style={{ width: "100%", textAlign: "right", height: "100%" }}>
                            <NavClose />
                        </span>
                    </HStack>
                    <hr style={{ marginBottom: 20, marginTop: 15 }} />
                    {content}
                </Box>
            </Box>
        )
    }
}

export default withTranslation()(Settings);