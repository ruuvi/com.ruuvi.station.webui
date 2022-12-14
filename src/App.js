import React from "react";
import {
  Routes,
  Route,
  HashRouter,
} from "react-router-dom";
import NetworkApi from "./NetworkApi";
import logo from './img/ruuvi-vector-logo.svg'
import logoDark from './img/ruuvi-vector-logo-dark.svg'
import { ChakraProvider, Text, HStack, Image, useColorMode, IconButton, Tooltip, useMediaQuery, Box } from "@chakra-ui/react"
import { ruuviTheme } from "./themes";
import pjson from "./../package.json"
import i18next from "i18next";
import { CloseIcon, SunIcon } from "@chakra-ui/icons";
import { MdOutlineNightlight } from "react-icons/md";
import cache from "./DataCache";
import { useTranslation } from "react-i18next";
import Store from "./Store";
import { goToLoginPage } from './utils/loginUtils'
const SignIn = React.lazy(() => import("./states/SignIn"));
const Dashboard = React.lazy(() => import("./states/Dashboard"));
const UserMenu = React.lazy(() => import("./components/UserMenu"));
const SensorMenu = React.lazy(() => import("./components/SensorMenu"));


const bottomText = {
  width: "100%",
  textAlign: "center",
  fontFamily: "mulish",
  fontSize: 16,
  fontWeight: 800,
  color: "#c8dbd9",
  marginTop: 20,
}

const versionText = {
  width: "100%",
  textAlign: "center",
  fontFamily: "mulish",
  fontSize: 10,
  fontWeight: 600,
  color: "#c8dbd9",
  paddingBottom: 20,
}

const supportLink = {
  fontFamily: "mulish",
  fontSize: "14px",
  width: "100%",
  textAlign: "center",
  color: "#1f9385",
  textDecoration: "underline",
}



let currColorMode;
function ColorModeSwitch() {
  const { t } = useTranslation();
  const { colorMode, toggleColorMode } = useColorMode()
  const [isMobile] = useMediaQuery("(max-width: 1023px)")

  if (currColorMode !== colorMode) {
    currColorMode = colorMode;
    try {
      document.querySelector('meta[name="theme-color"]').setAttribute("content", ruuviTheme.newColors.bodyBg[currColorMode]);
    } catch (error) {
    }
  }
  return (
    <>
      <Tooltip key="color_mode_tooltip" label={t("color_mode_tooltip")} hasArrow isDisabled={isMobile}>
        <IconButton variant="ghost" style={{ marginRight: 16 }} onClick={() => toggleColorMode()}>
          {colorMode === 'light' ? <MdOutlineNightlight /> : <SunIcon />}
        </IconButton>
      </Tooltip>
    </>
  )
}

function Logo() {
  const { colorMode } = useColorMode()
  if (colorMode === "light") {
    return (
      <a href="/#">
        <Image alt="logo" height={30} src={logo} fit="scale-down" />
      </a>
    )
  }
  return (
    <a href="/#">
      <Image alt="logo" height={30} src={logoDark} fit="scale-down" />
    </a>
  )
}

export default function App() {
  cache.init()
  try {
    let cookie = document.cookie;
    if (cookie) {
      let keys = cookie.split(";")
      keys.forEach(key => {
        if (key.indexOf("station_user=") !== -1) {
          let payload = key.replace("station_user=", "")
          //console.log("found station user cookie")
          let parsed = JSON.parse(payload)
          if (parsed && parsed.accessToken) {
            let domain = ".ruuvi.com"
            document.cookie = `station_user=;domain=${domain};Max-Age=-99999999`
            document.cookie = `station_status=signedIn;domain=${domain}`
            new NetworkApi().setUser(parsed)
          }
        }
      });
    }
  } catch (e) {
    console.log("could not parse cookie", e)
  }
  const urlSearchParams = new URLSearchParams(window.location.search);
  const params = Object.fromEntries(urlSearchParams.entries());
  if (params.lng) {
    const supportedLangs = ["en", "fi", "sv"]
    if (supportedLangs.indexOf(params.lng) > -1) {
      localStorage.setItem("selected_language", params.lng)
      i18next.changeLanguage(params.lng)
      window.location.href = window.location.href.split("?")[0];
    }
  }

  let { t, i18n } = useTranslation()

  let store = new Store();
  const [showBanner, setShowBanner] = React.useState(store.getShowBanner());
  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);
  const logout = () => {
    new NetworkApi().removeToken()
    localStorage.clear();
    cache.clear();
    window.location.replace("/#/")
    goToLoginPage();
    forceUpdate()
  }
  var user = new NetworkApi().getUser()
  var sensors = [];
  if (!user) {
    //goToLoginPage()
    return <ChakraProvider theme={ruuviTheme} style={{ minHeight: "100%" }}>
      <HashRouter>
        <SignIn loginSuccessful={data => {
          forceUpdate()
        }} />
      </HashRouter>
    </ChakraProvider>
  }
  new NetworkApi().getSettings(settings => {
    if (settings.result === "success")
      localStorage.setItem("settings", JSON.stringify(settings.data.settings))
  })
  return (
    <ChakraProvider theme={ruuviTheme}>
      <HashRouter basename="/">
        <HStack className="topbar" style={{ paddingLeft: "18px", paddingRight: "18px" }} height="60px">
          <Logo />
          <Text>
            {new NetworkApi().isStaging() ? "(staging) " : ""}
          </Text>
          <span style={{ width: "100%", textAlign: "right" }}>
            <ColorModeSwitch />
            <SensorMenu sensors={sensors} key={Math.random()} />
            <UserMenu settings={() => {
              if (window.location.href.indexOf("#") !== -1) {
                window.location.href += "?settings"
              } else {
                window.location.href += "#/?settings"
              }
            }} myAccount={() => {
              if (window.location.href.indexOf("#") !== -1) {
                window.location.href += "?myaccount"
              } else {
                window.location.href += "#/?myaccount"
              }
            }} email={user.email} />
          </span>
        </HStack>
        {showBanner &&
          <HStack className="banner" style={{ paddingLeft: "18px", paddingRight: "18px" }}>
            <Box flex style={{ textAlign: "center", width: "100%" }}>Your free Ruuvi Cloud Pro subscription plan has been extended with 2 additional months until the end of February 2023. If you've received an activation code with your recently purchased Ruuvi Gateway router, you'll be able to enter and activate it in February 2023. <a href="https://f.ruuvi.com/t/ruuvi-cloud-subscription-plans/5966" target={"_blank"} style={{ textDecoration: "underline" }} rel="noreferrer">Read more / lue lisää ⇗</a></Box>
            <Box flex style={{ width: "16px" }}>
              <div style={{ cursor: "pointer" }} onClick={() => {
                store.setShowBanner(false)
                setShowBanner(false);
              }}>
                <CloseIcon />
              </div>
            </Box>
          </HStack>
        }
        <div>
          <Routes>
            <Route path="/:id" element={<Dashboard reloadTags={() => { forceUpdate() }} />} />
            <Route path="/" element={<Dashboard reloadTags={() => { forceUpdate() }} />} />
          </Routes>
          <div style={bottomText}><a href={i18n.language === "fi" ? "https://ruuvi.com/fi" : "https://ruuvi.com/"} target="_blank" rel="noreferrer">ruuvi.com</a></div>
          <div style={supportLink}><a href={i18n.language === "fi" ? "https://ruuvi.com/fi/tuki" : "https://ruuvi.com/support"}>{t("support")}</a></div>
          <div style={versionText}>v{pjson.version}</div>
        </div>
      </HashRouter>
    </ChakraProvider>
  );
}