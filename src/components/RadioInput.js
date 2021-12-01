import {
    FormControl,
    FormLabel,
    RadioGroup,
    Radio,
    Stack,
    CircularProgress,
} from "@chakra-ui/react"
import { useTranslation } from 'react-i18next';

export default function RadioInput(props) {
    const { t } = useTranslation();

    return (
        <FormControl>
            <FormLabel>{t(props.label)} {props.loading && <CircularProgress mt="-1" size="4" isIndeterminate={true} color="primary" />}</FormLabel>
            <RadioGroup value={props.value} onChange={v => props.onChange(v)}>
                <Stack>
                    {props.options.map(o => <Radio key={o.label} colorScheme="primaryScheme" value={o.value}>{t(o.label)}</Radio>)}
                </Stack>
            </RadioGroup>
        </FormControl>
    )
}