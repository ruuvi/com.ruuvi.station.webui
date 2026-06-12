import {
    Menu,
    MenuList,
    MenuItem,
    MenuButton,
    Button,
    MenuDivider,
    MenuGroup,
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
        <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
            <MenuButton as={Button}
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                variant="ddl"
                className="durationPicker"
                style={{ ...detailedSubText }}
                borderRadius='4px'>
                {t('view')}
            </MenuButton>
            <MenuList zIndex={100}>
                <MenuGroup title={t('card_type')} style={{ paddingTop: 6 }}>
                    {opts.map((x, i) => {
                        let divider = <></>
                        let borderStyle = {};
                        if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                        if (i === opts.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                        return <div key={x.value + "p"}>
                            <MenuItem key={x.value} className={value === x.value ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }} onClick={() => onChange(x.value)}>{t(x.label)}</MenuItem>
                            {divider}
                        </div>
                    })}
                </MenuGroup>
                <MenuDivider />
                {showResetOrder && <>
                    <MenuGroup title={t('ordering')}>
                        <MenuItem style={{ ...detailedSubText }} onClick={() => resetOrder()}>{t("reset_order")}</MenuItem>
                    </MenuGroup>
                </>}
                <MenuGroup>
                    <MenuItem style={{ ...detailedSubText, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }} onClick={() => setAdaptiveLayout()}>{t(adaptiveLayout ? "disable_adaptive_layout" : "enable_adaptive_layout")}</MenuItem>
                </MenuGroup>
            </MenuList>
        </Menu>
    )
}