import React from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import { useTranslation } from "react-i18next";
import storage from "../utils/storage";

export default function DemoBanner() {
    const { t } = useTranslation();
    return (
        <Flex as="aside" aria-label={t("demo_mode", "Demo mode")} align="center" justify="space-between" gap={3} wrap="wrap" px={4} py={3} bg="teal.800" color="white">
            <Box>
                <Text fontWeight="bold">{t("demo_mode", "Demo mode")}</Text>
                <Text fontSize="sm">{t("demo_description", "Explore 90 days of sample data. Edits and sharing are simulated in this tab.")}</Text>
            </Box>
            <Flex gap={3} align="center">
                <Button size="sm" variant="outline" color="white" borderColor="whiteAlpha.600" onClick={() => {
                    storage.clear();
                    window.location.assign("/demo");
                }}>{t("demo_reset", "Reset demo")}</Button>
                <a href="/" style={{ textDecoration: "underline", fontSize: 14 }}>{t("demo_exit", "Exit demo")}</a>
            </Flex>
        </Flex>
    );
}
