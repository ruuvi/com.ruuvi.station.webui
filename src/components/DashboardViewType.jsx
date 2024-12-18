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

export default function DashboardViewType(props) {
    const { t } = useTranslation();
    let opts = [
        { label: "image_cards", value: "image_view" },
        { label: "image_history_cards", value: "image_graph_view" },
        { label: "history_cards", value: "graph_view" },
        { label: "simple_cards", value: "simple_view" }
    ]
    let current = props.value || "";

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
            <MenuList>
                <MenuGroup title={t('card_type')} style={{ paddingTop: 6 }}>
                    {opts.map((x, i) => {
                        let divider = <></>
                        let borderStyle = {};
                        if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                        if (i === opts.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                        return <div key={x.value + "p"}>
                            <MenuItem key={x.value} className={current === x.value ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }} onClick={() => props.onChange(x.value)}>{t(x.label)}</MenuItem>
                            {divider}
                        </div>
                    })}
                </MenuGroup>
                {props.showResetOrder && <>
                    <MenuDivider />
                    <MenuGroup title={t('ordering')}>
                        <MenuItem style={{ ...detailedSubText, borderRadius: 6 }} onClick={() => props.resetOrder()}>{t("reset_order")}</MenuItem>
                    </MenuGroup>
                </>}
            </MenuList>
        </Menu>
    )
}