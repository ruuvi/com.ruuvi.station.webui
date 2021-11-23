import {
    FormControl,
    FormLabel,
    RadioGroup,
    Radio,
    Stack,
} from "@chakra-ui/react"
import { useTranslation } from 'react-i18next';

export default function RadioInput(props) {
    const { t } = useTranslation();

    return (
        <FormControl>
            <FormLabel>{t(props.label)}</FormLabel>
            <RadioGroup value={props.value} onChange={v => props.onChange(v)}>
                <Stack>
                    {props.options.map(o => <Radio key={o.label} colorScheme="primaryScheme" value={o.value}>{t(o.label)}</Radio>)}
                </Stack>
            </RadioGroup>
        </FormControl>
    )
}