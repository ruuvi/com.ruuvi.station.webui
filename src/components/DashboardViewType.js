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
    var opts = [{ k: "Image View", v: "image" }, { k: "Graph View", v: "graph" }];
    return (
        <Menu autoSelect={false} strategy="fixed" placement="bottom-end">
            <MenuButton as={Button}
                rightIcon={<MdArrowDropDown size={26} className="buttonSideIcon" style={{ marginLeft: -10, marginRight: -8 }} />}
                variant="ddl"
                className="durationPicker"
                style={{ ...detailedSubText }}
                mr={props.mr}
                borderRadius='4px'>
                {t(opts.find(x => x.v === props.value).k)}
            </MenuButton>
            <MenuList>
                {opts.map((x, i) => {
                    let divider = <></>
                    let borderStyle = {};
                    if (i === 0) borderStyle = { borderTopLeftRadius: 6, borderTopRightRadius: 6 }
                    if (i === opts.length - 1) borderStyle = { borderBottomLeftRadius: 6, borderBottomRightRadius: 6 }
                    else divider = <MenuDivider />
                    return <div key={x.v + "p"}>
                        <MenuItem key={x.v} className={props.value === x.v ? "menuActive" : undefined} style={{ ...detailedSubText, ...borderStyle }} onClick={() => props.onChange(x.v)}>{t(x.k)}</MenuItem>
                        {divider}
                    </div>
                })}
            </MenuList>
        </Menu>
    )
}