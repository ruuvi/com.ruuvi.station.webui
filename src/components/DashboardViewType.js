import {
    Menu,
    MenuList,
    MenuItem,
    MenuButton,
    Button,
    MenuDivider,
} from "@chakra-ui/react"
import { MdArrowDropDown } from "react-icons/md"
import { useTranslation } from 'react-i18next';


const detailedSubText = {
    fontFamily: "mulish",
    fontSize: "14px",
}

export default function DashboardViewType(props) {
    const { t } = useTranslation();
    var opts = ["image_view", "graph_view", "simple_view"];
    return (
        <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
            <MenuButton as={Button}
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                variant="ddl"
                className="durationPicker"
                style={{ ...detailedSubText }}
                borderRadius='4px'>
                {t(opts.find(x => x === props.value))}
            </MenuButton>
            <MenuList>
                {opts.map((x, i) => {
                    let divider = <></>
                    let borderStyle = {};
                    if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                    if (i === opts.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                    else divider = <MenuDivider />
                    return <div key={x + "p"}>
                        <MenuItem key={x} className={props.value === x ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }} onClick={() => props.onChange(x)}>{t(x)}</MenuItem>
                        {divider}
                    </div>
                })}
            </MenuList>
        </Menu>
    )
}