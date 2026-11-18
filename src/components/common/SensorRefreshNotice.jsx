import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import { AlertWarningIcon } from "../ui/chakra-icons";

export default function SensorRefreshNotice({ status }) {
    const { t } = useTranslation();
    if (!status) return null;
    return (
        <Flex role="status" align="center" gap={3} p={4} my={4} borderRadius="md"
            bg={{ base: "yellow.50", _dark: "yellow.900" }}
            color={{ base: "yellow.900", _dark: "yellow.100" }}>
            <Box flexShrink={0}><AlertWarningIcon aria-hidden="true" /></Box>
            <Text fontFamily="mulish">
                {status === "throttled"
                    ? t("UserApiError.ER_THROTTLED", { defaultValue: "Too many requests" })
                    : t(["sensor_refresh_unavailable", "internet_connection_problem"])}
            </Text>
        </Flex>
    );
}
