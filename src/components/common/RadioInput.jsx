import { Field, RadioGroup, Stack, Box } from "@chakra-ui/react"
import { CircleProgress } from "../ui/progress"
import { useTranslation } from 'react-i18next';

// v3 radio groups are string-keyed; the app passes booleans for yes/no
// options, so normalise both sides and let callers keep parsing the string.
const asValue = (value) => (value === undefined || value === null ? null : String(value));

export default function RadioInput(props) {
    const { t } = useTranslation();

    return (
        <Field.Root {...props.style}>
            <Field.Label display="flex" alignItems="center" gap={2}>
                <span>{t(props.label)}</span>
                <Box w="1rem" h="1rem" display="inline-flex" alignItems="center" justifyContent="center">
                    {props.loading && (
                        <CircleProgress boxSize="16px" thickness="1.6px" color="primary" trackColor="#edebe9" mt="-1" />
                    )}
                </Box>
            </Field.Label>
            <RadioGroup.Root value={asValue(props.value)} onValueChange={e => props.onChange(e.value)}>
                <Stack
                    pointerEvents={props.loading ? "none" : "auto"}
                    opacity={props.loading ? 0.6 : 1}
                    transition="opacity 0.15s"
                >
                    {props.options.map(o => (
                        <RadioGroup.Item key={String(o.value)} colorPalette="ruuvi" value={asValue(o.value)}>
                            <RadioGroup.ItemHiddenInput />
                            <RadioGroup.ItemIndicator />
                            <RadioGroup.ItemText>
                                {t(o.label).replace("℃", "°C").replace("℉", "°F")}
                            </RadioGroup.ItemText>
                        </RadioGroup.Item>
                    ))}
                </Stack>
            </RadioGroup.Root>
        </Field.Root>
    )
}
