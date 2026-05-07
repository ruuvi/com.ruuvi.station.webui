import * as computeStatsTool from "./computeStats";
import * as getAlertsTool from "./getAlerts";
import * as listSensorsTool from "./listSensors";
import * as readSensorDataTool from "./readSensorData";
import * as setAlertTool from "./setAlert";

export const toolModules = [
    listSensorsTool,
    readSensorDataTool,
    computeStatsTool,
    getAlertsTool,
    setAlertTool
];
