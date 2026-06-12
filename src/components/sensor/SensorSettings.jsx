import React, { useRef } from "react";
import {
    IconButton,
    Box,
    List,
    ListItem,
    Accordion,
    AccordionItem,
    AccordionButton,
    AccordionPanel,
    AccordionIcon,
} from "@chakra-ui/react"
import { MdChevronRight } from "react-icons/md"
import Store from "../../Store";
import withRouter from "../../utils/withRouter"
import { alertTypes, getUnitHelper, localeNumber } from "../../UnitHelper";
import { addVariablesInString, uppercaseFirst } from "../../TextHelper";
import AlertItem from "../alerts/AlertItem";
import EditableText from "../common/EditableText";
import SensorNotesPreview from "./SensorNotesPreview";
import useIsLargeDisplay from "../hooks/useIsLargeDisplay";
import {
    getAlertTypesOrdered,
    getAlertVisibleFieldIndexes,
    getMappedAlertDataType,
} from "../../utils/alertHelper";
import { visibilityCodes } from "../../utils/cloudTranslator";
import { getAlert, getLatestReading, sensorHasData } from "../../utils/sensorHelper";

const collapseText = {
    fontFamily: "montserrat",
    fontSize: "24px",
    fontWeight: 800,
    padding: "10px",
}
const detailedTitle = {
    fontFamily: "mulish",
    fontSize: "16px",
    fontWeight: 800,
    width: "50%",
}
const detailedText = {
    fontFamily: "mulish",
    fontSize: "14px",
    width: "100%",
    textAlign: "right",
    verticalAlign: "middle",
}
const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

const accordionPanel = {
    paddingTop: 0,
    paddingBottom: 0,
}
const accordionContent = {
    minHeight: 72,
    marginLeft: 10,
    width: "calc(100% - 16px)",
}
const accordionButton = {
    paddingRight: 21,
}

function AccordionText(props) {
    const isLargeDisplay = useIsLargeDisplay();
    const tstyle = isLargeDisplay ? collapseText : { ...collapseText, fontSize: "18px" };
    return <Box flex="1" textAlign="left" style={tstyle}>
        {props.children}
    </Box>
}

function SensorSettings(props) {
    const { t, sensor, router, latestReading, mainSensorFields, isShared, updateAlert, setGraphKey, onEditName, onEditNotes, onEditVisibility, onOffsetClick, onRemoveClick } = props;

    const openAccordionsRef = useRef(Store.getOpenAccordions() || [0]);

    const sensorSubscription = sensor?.subscription;
    const hasData = sensorHasData(sensor);
    const alertFieldIndexes = getAlertVisibleFieldIndexes(alertTypes, mainSensorFields);
    const orderedAlertTypes = getAlertTypesOrdered(alertTypes, alertFieldIndexes);

    return (
        <Box id="settings">
            <div style={{ height: "20px" }} />
            <Accordion allowMultiple defaultIndex={openAccordionsRef.current} onChange={v => Store.setOpenAccordions(v)}>
                <AccordionItem>
                    <AccordionButton style={accordionButton} _hover={{}}>
                        <AccordionText>{t("general")}</AccordionText>
                        <AccordionIcon />
                    </AccordionButton>
                    <hr />
                    <AccordionPanel style={accordionPanel}>
                        <List>
                            <ListItem>
                                <table style={accordionContent}>
                                    <tbody>
                                        <tr>
                                            <td style={detailedTitle}>{t("sensor_name")}</td>
                                            <td style={detailedText}>
                                                <EditableText text={sensor.name} onClick={onEditName} />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </ListItem>
                            <hr />
                            <ListItem>
                                <table style={accordionContent}>
                                    <tbody>
                                        <tr>
                                            <td style={detailedTitle}>{t("owner")}</td>
                                            <td style={detailedText}>{sensor.owner.toLowerCase()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </ListItem>
                            <hr />
                            {sensor.canShare ?
                                <ListItem style={{ cursor: "pointer" }} onClick={() => router.navigate(`/shares?sensor=${sensor.sensor}`)}>
                                    <table style={accordionContent}>
                                        <tbody>
                                            <tr>
                                                <td style={detailedTitle}>{t("share")}</td>
                                                <td style={detailedText}>
                                                    {addVariablesInString(t("shared_to_x"), [sensor.sharedTo.length, sensor.subscription.maxSharesPerSensor])}
                                                    <IconButton variant="ghost" icon={<MdChevronRight />} _hover={{}} />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </ListItem>
                                :
                                <ListItem>
                                    <table style={accordionContent}>
                                        <tbody>
                                            <tr>
                                                <td style={detailedTitle}>{t("owners_plan")}</td>
                                                <td style={detailedText}>{sensorSubscription?.subscriptionName || JSON.stringify(sensorSubscription)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </ListItem>
                            }
                            {!isShared && <>
                                <hr />
                                <ListItem style={{ cursor: "pointer" }} onClick={onEditVisibility}>
                                    <table style={accordionContent}>
                                        <tbody>
                                            <tr>
                                                <td style={detailedTitle}>{t("visible_measurements")}</td>
                                                <td style={detailedText}>
                                                    {(() => {
                                                        const useDefault = sensor.settings?.defaultDisplayOrder || "true";
                                                        if (useDefault === "true") return t("use_default");
                                                        const visibleFields = sensor.settings?.displayOrder ? JSON.parse(sensor.settings.displayOrder) : [];
                                                        let maxAvailable = 0;
                                                        const parsed0 = sensor?.measurements?.[0]?.parsed;
                                                        if (parsed0) {
                                                            const presentKeys = Object.keys(parsed0);
                                                            maxAvailable = visibilityCodes.filter(vc => presentKeys.includes(vc[1])).length;
                                                        }
                                                        return visibleFields.length > 0 ? `${visibleFields.length}/${maxAvailable || visibleFields.length}` : t("no_visible_measurements");
                                                    })()}
                                                    <IconButton variant="ghost" icon={<MdChevronRight />} _hover={{}} />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </ListItem>
                            </>}
                            <hr />
                            <ListItem>
                                <table style={accordionContent}>
                                    <tbody>
                                        <tr>
                                            <td style={detailedTitle}>{t("notes")}</td>
                                            <td style={detailedText}>
                                                {!isShared && <EditableText text="" onClick={onEditNotes} />}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </ListItem>
                        </List>
                        <SensorNotesPreview text={sensor.settings?.description} t={t} />
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                    <AccordionButton style={accordionButton} _hover={{}}>
                        <AccordionText>{t("alerts")}</AccordionText>
                        <AccordionIcon />
                    </AccordionButton>
                    <hr />
                    <AccordionPanel style={accordionPanel}>
                        <List style={accordionContent}>
                            {sensorSubscription.subscriptionName === "Free" && <Box pt={6} pb={6} style={detailedSubText}>
                                {(() => {
                                    const text = t("sensor_alert_free_info");
                                    const parts = text.split(t("cloud_ruuvi_link"));
                                    return <div>{parts[0]}<a style={{ color: "teal" }} target="blank" href={t("cloud_ruuvi_link_url")}>{t("cloud_ruuvi_link")}</a>{parts[1]}</div>;
                                })()}
                            </Box>}
                            {orderedAlertTypes.map(x => {
                                const dataKey = getMappedAlertDataType(x);
                                const latestValue = latestReading[dataKey];
                                if (latestValue === undefined && x !== "offline") return null;

                                const alert = getAlert(sensor, x);
                                const ignoreVisibleTypes = ["offline"];

                                if (!ignoreVisibleTypes.includes(x)) {
                                    if (alertFieldIndexes.get(x) === -1) return null;
                                }

                                const key = alert ? alert.min + "" + alert.max + "" + alert.enabled.toString() + "" + alert.description + x : x;
                                return <ListItem key={key}>
                                    <AlertItem alerts={sensor.alerts} alert={alert} sensor={sensor}
                                        latestValue={latestValue}
                                        noUpgradeButton={isShared || !hasData}
                                        showOffline={sensorSubscription.offlineAlertAllowed}
                                        showDelay={sensorSubscription.delayedAlertAllowed}
                                        detailedTitle={detailedTitle}
                                        detailedText={detailedText} detailedSubText={detailedSubText}
                                        type={x} dataKey={dataKey} onChange={updateAlert} />
                                </ListItem>;
                            })}
                        </List>
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem hidden={isShared}>
                    <AccordionButton style={accordionButton} _hover={{}}>
                        <AccordionText>{t("offset_correction")}</AccordionText>
                        <AccordionIcon />
                    </AccordionButton>
                    <hr />
                    <AccordionPanel style={accordionPanel}>
                        <List>
                            {["Temperature", "Humidity", "Pressure"].map(x => {
                                if (latestReading[x.toLowerCase()] === undefined) return null;
                                const uh = getUnitHelper(x.toLocaleLowerCase());
                                let value = uh.value(sensor["offset" + x], true);
                                let unit = uh.unit;
                                if (x === "Humidity") {
                                    value = sensor["offset" + x];
                                    unit = "%";
                                }
                                return <ListItem key={x} style={{ cursor: "pointer" }} onClick={() => onOffsetClick(x)}>
                                    <table style={accordionContent}>
                                        <tbody>
                                            <tr>
                                                <td style={detailedTitle}> {t(x.toLocaleLowerCase())}</td>
                                                <td style={detailedText}>
                                                    {localeNumber(value, uh.decimals)} {unit} <IconButton _hover={{}} variant="ghost" icon={<MdChevronRight />} />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    {x !== "Pressure" && <hr />}
                                </ListItem>;
                            })}
                        </List>
                    </AccordionPanel>
                </AccordionItem>
                <AccordionItem>
                    <AccordionButton style={accordionButton} _hover={{}}>
                        <AccordionText>{uppercaseFirst(t("more_info"))}</AccordionText>
                        <AccordionIcon />
                    </AccordionButton>
                    <hr />
                    <AccordionPanel style={accordionPanel}>
                        <List>
                            {(() => {
                                const readings = getLatestReading(sensor);
                                if (!readings) return null;

                                const moreInfoFields = ["mac", "dataFormat", "rssi", "measurementSequenceNumber"];

                                return moreInfoFields.map((order, i) => {
                                    const x = order === "mac"
                                        ? { key: "mac", value: sensor.sensor }
                                        : readings[order] !== undefined ? { key: order, value: readings[order] } : null;
                                    if (!x) return null;
                                    const uh = getUnitHelper(x.key);
                                    return (
                                        <ListItem key={x.key}>
                                            <table style={{ ...accordionContent, cursor: uh.graphable ? "pointer" : "" }} onClick={() => uh.graphable ? setGraphKey(x.key) : undefined}>
                                                <tbody>
                                                    <tr>
                                                        <td style={detailedTitle}> {t(uh.label || x.key)}</td>
                                                        <td style={{ ...detailedText, textDecoration: uh.graphable ? "underline" : "" }}>
                                                            {localeNumber(uh.value(x.value), uh.decimals)} {uh.unit}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            {i !== moreInfoFields.length - 1 && <hr />}
                                        </ListItem>
                                    );
                                });
                            })()}
                        </List>
                    </AccordionPanel>
                </AccordionItem>

                <AccordionItem>
                    <AccordionButton style={accordionButton} _hover={{}}>
                        <AccordionText>{t("remove")}</AccordionText>
                        <AccordionIcon />
                    </AccordionButton>
                    <hr />
                    <AccordionPanel style={accordionPanel}>
                        <List>
                            <ListItem style={{ cursor: "pointer" }} onClick={onRemoveClick}>
                                <table width="100%" style={accordionContent}>
                                    <tbody>
                                        <tr>
                                            <td style={detailedTitle}>{t("remove_this_sensor")}</td>
                                            <td style={detailedText}>
                                                <IconButton variant="ghost" icon={<MdChevronRight />} _hover={{}} />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </ListItem>
                        </List>
                    </AccordionPanel>
                </AccordionItem>
            </Accordion>
        </Box>
    );
}

export default withRouter(SensorSettings);
