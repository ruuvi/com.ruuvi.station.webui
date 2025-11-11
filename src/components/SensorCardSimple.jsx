import React from "react";
import { Box, Flex, Heading } from "@chakra-ui/react";
import SmallStats from "./SensorCardStats";

const SensorCardSimple = ({
    sensor,
    size,
    latestReading,
    stats,
    alertIcon,
    moreMenu,
    altFileUpload,
    infoRow,
    renderNoData,
    smallDataMinHeight,
    getAlertState,
    t,
}) => (
    <Box
        className="content sensorCard"
        borderRadius="lg"
        marginBottom={size === "mobile" ? "10px" : "20px"}
        minH={130}
        display="flex"
        flexDirection="column"
    >
        {altFileUpload}
        <Box
            overflow="hidden"
            padding={4}
            flex="1"
            display="flex"
            flexDirection="column"
        >
            <Flex pb={1}>
                <Flex grow={1} width="calc(100% - 40px)">
                    <Heading
                        size="xs"
                        style={{
                            lineHeight: 1,
                            fontFamily: "montserrat",
                            fontSize: 16,
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginRight: 2,
                        }}
                    >
                        {sensor.name}
                    </Heading>
                </Flex>
                <Flex width="15px" mt="0.5">
                    {alertIcon}
                </Flex>
                <Flex width="24px" height="20px">
                    {moreMenu}
                </Flex>
            </Flex>

            {latestReading ? (
                <SmallStats
                    fields={stats}
                    latestReading={latestReading}
                    options={{
                        minHeight: smallDataMinHeight,
                        pt: 2,
                        opacity: 0.8,
                        simpleView: true,
                    }}
                    getAlertState={getAlertState}
                    t={t}
                />
            ) : (
                renderNoData(
                    t("no_data")
                        .split("\n")
                        .map((line) => <div key={line}>{line}</div>),
                    { simpleView: true, showGraph: false }
                )
            )}
        </Box>
        {latestReading && (
            <Box pr={4} pl={4} pb={2} mt={"-4px"}>
                {infoRow}
            </Box>
        )}
    </Box>
);

export default SensorCardSimple;
