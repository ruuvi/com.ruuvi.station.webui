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
    let optLabels = ["image_cards", "history_cards", "simple_cards"];
    let opts = ["image_view", "graph_view", "simple_view"]
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
                        return <div key={x + "p"}>
                            <MenuItem key={x} className={current === x ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }} onClick={() => props.onChange(x)}>{t(optLabels[i])}</MenuItem>
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