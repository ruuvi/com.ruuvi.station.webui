import React, { Fragment, useCallback, useMemo } from "react";
import {
    IconButton,
    Menu,
    Portal,
    useDisclosure,
} from "@chakra-ui/react";
import { MdMoreVert } from "react-icons/md";
import { ArrowDownIcon, ArrowUpIcon } from "../ui/chakra-icons";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SensorCardMenu = ({
    sensor,
    simpleView: _simpleView,
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
    const { open, onOpen, onClose } = useDisclosure();

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
                icon: <ArrowUpIcon style={{ marginInlineEnd: 8 }} />,
                params: 1,
            },
            {
                key: "moveDown",
                label: "move_down",
                action: "move",
                icon: <ArrowDownIcon style={{ marginInlineEnd: 8 }} />,
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
        <Menu.Root
            open={open}
            onOpenChange={(e) => (e.open ? onOpen() : onClose())}
            positioning={{ gutter: 16 }}
        >
            <Menu.Trigger asChild>
                <IconButton
                    aria-label="sensor menu"
                    onClick={(event) => {
                        event.stopPropagation();
                    }}
                    onPointerDown={(event) => {
                        event.stopPropagation();
                    }}
                    variant="topbar"
                    style={{
                        zIndex: 2,
                        backgroundColor: "transparent",
                        transition: "color 0.2s ease-in-out",
                        cursor: disabled ? "default" : undefined,
                    }}
                    _hover={{ color: disabled ? undefined : "primary" }}
                    disabled={disabled}
                    top={-4}
                    right={0}
                    height={55}
                    mt={mt}
                >
                    <MdMoreVert size={23} />
                </IconButton>
            </Menu.Trigger>

            <Portal>
                <Menu.Positioner zIndex="popover">
                    <Menu.Content>
                        {menuItems
                            .filter((item) => item.condition !== false)
                            .map((item, index) => (
                                <Fragment key={item.key}>
                                    {index > 0 && <Menu.Separator />}
                                    <Menu.Item
                                        value={item.key}
                                        className="ddlItem"
                                        onClick={(event) => handleAction(event, item)}
                                    >
                                        {item.icon}
                                        {t(item.label)}
                                    </Menu.Item>
                                </Fragment>
                            ))}
                    </Menu.Content>
                </Menu.Positioner>
            </Portal>
        </Menu.Root>
    );
};

export default SensorCardMenu;
