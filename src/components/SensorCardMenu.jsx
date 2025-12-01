import React, { Fragment, useCallback, useMemo } from "react";
import {
    IconButton,
    Menu,
    MenuButton,
    MenuDivider,
    MenuItem,
    MenuList,
    Portal,
    useDisclosure,
} from "@chakra-ui/react";
import { ArrowDownIcon, ArrowUpIcon } from "@chakra-ui/icons";
import { MdMoreVert } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SensorCardMenu = ({
    sensor,
    simpleView,
    uploadBg,
    rename,
    share,
    move,
    remove,
    mt,
    disabled = false,
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { isOpen, onOpen, onClose, onToggle } = useDisclosure();

    const menuItems = useMemo(
        () => [
            { key: "history", label: "history_view", action: "navigate" },
            { key: "settings", label: "settings_and_alerts", action: "navigate" },
            { key: "change_background", label: "change_background", action: "uploadBg" },
            { key: "rename", label: "rename", action: "rename" },
            {
                key: "share",
                label: "share",
                action: "share",
                condition: sensor?.canShare,
            },
            {
                key: "moveUp",
                label: "move_up",
                action: "move",
                icon: <ArrowUpIcon mr={2} />,
                params: 1,
            },
            {
                key: "moveDown",
                label: "move_down",
                action: "move",
                icon: <ArrowDownIcon mr={2} />,
                params: -1,
            },
            { key: "remove", label: "remove", action: "remove" },
        ],
        [sensor?.canShare],
    );

    const handleAction = useCallback(
        (event, item) => {
            event.preventDefault();
            event.stopPropagation();

            switch (item.action) {
                case "navigate":
                    navigate(`/${sensor.sensor}?scrollTo=${item.key}`);
                    break;
                case "uploadBg":
                    uploadBg();
                    break;
                case "rename":
                    rename();
                    break;
                case "share":
                    share();
                    break;
                case "move":
                    move(item.params);
                    break;
                case "remove":
                    remove();
                    break;
                default:
                    break;
            }

            onClose();
        },
        [move, navigate, onClose, remove, rename, sensor.sensor, share, uploadBg],
    );

    return (
        <Menu autoSelect={false} isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
            <MenuButton
                as={IconButton}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onToggle();
                }}
                onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                icon={<MdMoreVert size={23} />}
                variant="topbar"
                style={{
                    zIndex: 2,
                    backgroundColor: "transparent",
                    transition: "color 0.2s ease-in-out",
                    cursor: disabled ? "default" : undefined,
                }}
                _hover={{ color: disabled ? undefined : "primary"}}
                disabled={disabled}
                top={-4}
                right={0}
                height={55}
                mt={mt}
            />

            <Portal>
                <MenuList mt="2" zIndex="popover">
                    {menuItems
                        .filter((item) => item.condition !== false)
                        .map((item, index) => (
                            <Fragment key={item.key}>
                                {index > 0 && <MenuDivider />}
                                <MenuItem
                                    className="ddlItem"
                                    onClick={(event) => handleAction(event, item)}
                                >
                                    {item.icon}
                                    {t(item.label)}
                                </MenuItem>
                            </Fragment>
                        ))}
                </MenuList>
            </Portal>
        </Menu>
    );
};

export default SensorCardMenu;
