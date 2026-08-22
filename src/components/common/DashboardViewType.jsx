import {
    Menu,
    Button,
    Portal,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import { useTranslation } from 'react-i18next';


const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

export default function DashboardViewType({ value, onChange, showResetOrder, resetOrder, adaptiveLayout, setAdaptiveLayout }) {
    const { t } = useTranslation();
    let opts = [
        { label: "image_cards", value: "image_view" },
        { label: "image_history_cards", value: "image_graph_view" },
        { label: "history_cards", value: "graph_view" },
        { label: "simple_cards", value: "simple_view" }
    ]

    return (
        <Menu.Root positioning={{ strategy: "fixed", placement: "bottom-end" }}>
            <Menu.Trigger asChild>
                <Button
                    variant="ddl"
                    className="durationPicker"
                    style={{ ...detailedSubText }}
                    borderRadius='4px'>
                    {t('view')}
                    <MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />
                </Button>
            </Menu.Trigger>
            <Portal>
                <Menu.Positioner zIndex={100}>
                    <Menu.Content>
                        <Menu.ItemGroup>
                            <Menu.ItemGroupLabel style={{ paddingTop: 6 }}>{t('card_type')}</Menu.ItemGroupLabel>
                            {opts.map((x, i) => {
                                let borderStyle = {};
                                if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                                if (i === opts.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                                return <div key={x.value + "p"}>
                                    <Menu.Item value={x.value} className={value === x.value ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }} onClick={() => onChange(x.value)}>{t(x.label)}</Menu.Item>
                                </div>
                            })}
                        </Menu.ItemGroup>
                        <Menu.Separator />
                        {showResetOrder && <>
                            <Menu.ItemGroup>
                                <Menu.ItemGroupLabel>{t('ordering')}</Menu.ItemGroupLabel>
                                <Menu.Item value="reset_order" style={{ ...detailedSubText }} onClick={() => resetOrder()}>{t("reset_order")}</Menu.Item>
                            </Menu.ItemGroup>
                        </>}
                        <Menu.ItemGroup>
                            <Menu.Item value="adaptive_layout" style={{ ...detailedSubText, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} onClick={() => setAdaptiveLayout()}>{t(adaptiveLayout ? "disable_adaptive_layout" : "enable_adaptive_layout")}</Menu.Item>
                        </Menu.ItemGroup>
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    )
}
