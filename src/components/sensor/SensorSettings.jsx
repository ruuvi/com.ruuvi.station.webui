import React, { useRef } from "react";
import {
    IconButton,
    Box,
    List,
    Accordion,
} from "@chakra-ui/react"
import { MdChevronRight } from "react-icons/md"
import { ChevronDownIcon } from "../ui/chakra-icons";
import Store from "../../Store";
import withRouter from "../../utils/withRouter"
import { alertTypes, getMaxDecimals, getUnitHelper, localeNumber } from "../../UnitHelper";
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

    // v3 accordions are keyed by string values; keep persisting plain indexes.
    const openAccordionsRef = useRef((Store.getOpenAccordions() || [0]).map(String));

    const sensorSubscription = sensor?.subscription;
    const hasData = sensorHasData(sensor);
    const alertFieldIndexes = getAlertVisibleFieldIndexes(alertTypes, mainSensorFields);
    const orderedAlertTypes = getAlertTypesOrdered(alertTypes, alertFieldIndexes);

    return (
        <Box id="settings">
            <div style={{ height: "20px" }} />
            <Accordion.Root multiple defaultValue={openAccordionsRef.current} onValueChange={d => Store.setOpenAccordions(d.value.map(Number))}>
                <Accordion.Item value="0">
                    <Accordion.ItemTrigger style={accordionButton} _hover={{}}>
                        <AccordionText>{t("general")}</AccordionText>
                        <Accordion.ItemIndicator><ChevronDownIcon /></Accordion.ItemIndicator>
                    </Accordion.ItemTrigger>
                    <hr />
                    <Accordion.ItemContent>
                        <Accordion.ItemBody style={accordionPanel}>
                        <List.Root listStyleType="none" gap={0}>
                            <List.Item>
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
                            </List.Item>
                            <hr />
                            <List.Item>
                                <table style={accordionContent}>
                                    <tbody>
                                        <tr>
                                            <td style={detailedTitle}>{t("owner")}</td>
                                            <td style={detailedText}>{sensor.owner.toLowerCase()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </List.Item>
                            <hr />
                            {sensor.canShare ?
                                <List.Item style={{ cursor: "pointer" }} onClick={() => router.navigate(`/shares?sensor=${sensor.sensor}`)}>
                                    <table style={accordionContent}>
                                        <tbody>
                                            <tr>
                                                <td style={detailedTitle}>{t("share")}</td>
                                                <td style={detailedText}>
                                                    {addVariablesInString(t("shared_to_x"), [sensor.sharedTo.length, sensor.subscription.maxSharesPerSensor])}
                                                    <IconButton aria-label="open" variant="ghost" _hover={{}}><MdChevronRight /></IconButton>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </List.Item>
                                :
                                <List.Item>
                                    <table style={accordionContent}>
                                        <tbody>
                                            <tr>
                                                <td style={detailedTitle}>{t("owners_plan")}</td>
                                                <td style={detailedText}>{sensorSubscription?.subscriptionName || JSON.stringify(sensorSubscription)}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </List.Item>
                            }
                            {!isShared && <>
                                <hr />
                                <List.Item style={{ cursor: "pointer" }} onClick={onEditVisibility}>
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
                                                    <IconButton aria-label="open" variant="ghost" _hover={{}}><MdChevronRight /></IconButton>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </List.Item>
                            </>}
                            <hr />
                            <List.Item>
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
                            </List.Item>
                        </List.Root>
                        <SensorNotesPreview text={sensor.settings?.description} t={t} />
                    </Accordion.ItemBody>
                        </Accordion.ItemContent>
                </Accordion.Item>
                <Accordion.Item value="1">
                    <Accordion.ItemTrigger style={accordionButton} _hover={{}}>
                        <AccordionText>{t("alerts")}</AccordionText>
                        <Accordion.ItemIndicator><ChevronDownIcon /></Accordion.ItemIndicator>
                    </Accordion.ItemTrigger>
                    <hr />
                    <Accordion.ItemContent>
                        <Accordion.ItemBody style={accordionPanel}>
                        <List.Root listStyleType="none" gap={0} style={accordionContent}>
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
                                return <List.Item key={key}>
                                    <AlertItem alerts={sensor.alerts} alert={alert} sensor={sensor}
                                        latestValue={latestValue}
                                        noUpgradeButton={isShared || !hasData}
                                        showOffline={sensorSubscription.offlineAlertAllowed}
                                        showDelay={sensorSubscription.delayedAlertAllowed}
                                        detailedTitle={detailedTitle}
                                        detailedText={detailedText} detailedSubText={detailedSubText}
                                        type={x} dataKey={dataKey} onChange={updateAlert} />
                                </List.Item>;
                            })}
                        </List.Root>
                    </Accordion.ItemBody>
                        </Accordion.ItemContent>
                </Accordion.Item>
                <Accordion.Item value="2" hidden={isShared}>
                    <Accordion.ItemTrigger style={accordionButton} _hover={{}}>
                        <AccordionText>{t("offset_correction")}</AccordionText>
                        <Accordion.ItemIndicator><ChevronDownIcon /></Accordion.ItemIndicator>
                    </Accordion.ItemTrigger>
                    <hr />
                    <Accordion.ItemContent>
                        <Accordion.ItemBody style={accordionPanel}>
                        <List.Root listStyleType="none" gap={0}>
                            {["Temperature", "Humidity", "Pressure"].map(x => {
                                if (latestReading[x.toLowerCase()] === undefined) return null;
                                const uh = getUnitHelper(x.toLocaleLowerCase());
                                let value = uh.value(sensor["offset" + x], true);
                                let unit = uh.unit;
                                if (x === "Humidity") {
                                    value = sensor["offset" + x];
                                    unit = "%";
                                }
                                return <List.Item key={x} style={{ cursor: "pointer" }} onClick={() => onOffsetClick(x)}>
                                    <table style={accordionContent}>
                                        <tbody>
                                            <tr>
                                                <td style={detailedTitle}> {t(x.toLocaleLowerCase())}</td>
                                                <td style={detailedText}>
                                                    {localeNumber(value, getMaxDecimals(x.toLocaleLowerCase()))} {unit} <IconButton aria-label="open" _hover={{}} variant="ghost"><MdChevronRight /></IconButton>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    {x !== "Pressure" && <hr />}
                                </List.Item>;
                            })}
                        </List.Root>
                    </Accordion.ItemBody>
                        </Accordion.ItemContent>
                </Accordion.Item>
                <Accordion.Item value="3">
                    <Accordion.ItemTrigger style={accordionButton} _hover={{}}>
                        <AccordionText>{uppercaseFirst(t("more_info"))}</AccordionText>
                        <Accordion.ItemIndicator><ChevronDownIcon /></Accordion.ItemIndicator>
                    </Accordion.ItemTrigger>
                    <hr />
                    <Accordion.ItemContent>
                        <Accordion.ItemBody style={accordionPanel}>
                        <List.Root listStyleType="none" gap={0}>
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
                                        <List.Item key={x.key}>
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
                                        </List.Item>
                                    );
                                });
                            })()}
                        </List.Root>
                    </Accordion.ItemBody>
                        </Accordion.ItemContent>
                </Accordion.Item>

                <Accordion.Item value="4">
                    <Accordion.ItemTrigger style={accordionButton} _hover={{}}>
                        <AccordionText>{t("remove")}</AccordionText>
                        <Accordion.ItemIndicator><ChevronDownIcon /></Accordion.ItemIndicator>
                    </Accordion.ItemTrigger>
                    <hr />
                    <Accordion.ItemContent>
                        <Accordion.ItemBody style={accordionPanel}>
                        <List.Root listStyleType="none" gap={0}>
                            <List.Item style={{ cursor: "pointer" }} onClick={onRemoveClick}>
                                <table width="100%" style={accordionContent}>
                                    <tbody>
                                        <tr>
                                            <td style={detailedTitle}>{t("remove_this_sensor")}</td>
                                            <td style={detailedText}>
                                                <IconButton aria-label="open" variant="ghost" _hover={{}}><MdChevronRight /></IconButton>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </List.Item>
                        </List.Root>
                    </Accordion.ItemBody>
                        </Accordion.ItemContent>
                </Accordion.Item>
            </Accordion.Root>
        </Box>
    );
}

export default withRouter(SensorSettings);
