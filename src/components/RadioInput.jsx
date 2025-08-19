import { FormControl, FormLabel, RadioGroup, Radio, Stack, CircularProgress, Box } from "@chakra-ui/react"
import { useTranslation } from 'react-i18next';

export default function RadioInput(props) {
    const { t } = useTranslation();

    return (
        <FormControl {...props.style}>
            <FormLabel display="flex" alignItems="center" gap={2}>
                <span>{t(props.label)}</span>
                <Box w="1rem" h="1rem" display="inline-flex" alignItems="center" justifyContent="center">
                    {props.loading && (
                        <CircularProgress size="4" isIndeterminate color="primary" mt="-1" />
                    )}
                </Box>
            </FormLabel>
            <RadioGroup value={props.value} onChange={v => props.onChange(v)}>
                <Stack
                    pointerEvents={props.loading ? "none" : "auto"}
                    opacity={props.loading ? 0.6 : 1}
                    transition="opacity 0.15s"
                >
                    {props.options.map(o => (
                        <Radio key={o.value} colorScheme="buttonIconScheme" value={o.value}>
                            {t(o.label).replace("℃", "°C").replace("℉", "°F")}
                        </Radio>
                    ))}
                </Stack>
            </RadioGroup>
        </FormControl>
    )
}