import React, { useEffect, useState } from "react";
import {
  Routes,
  Route,
  BrowserRouter,
  useNavigate,
} from "react-router-dom";
import NetworkApi from "./NetworkApi";
import logo from './img/ruuvi-vector-logo.svg'
import logoDark from './img/ruuvi-vector-logo-dark.svg'
import { ChakraProvider, Text, HStack, Image, useColorMode, IconButton, Tooltip, useMediaQuery, Box, useBreakpointValue, Button } from "@chakra-ui/react"
import { ruuviTheme } from "./themes";
import pjson from "./../package.json"
import i18next from "i18next";
import { SunIcon } from "@chakra-ui/icons";
import { IoClose } from "react-icons/io5";
import { MdOutlineNightlight } from "react-icons/md";
import cache from "./DataCache";
import { useTranslation } from "react-i18next";
import Store from "./Store";
import { logout } from "./utils/loginUtils";
import ShareCenter from "./states/ShareCenter";
import AddSensorModal from "./components/AddSensorModal";
import SettingsModal from "./components/SettingsModal";
import MyAccountModal from "./components/MyAccountModal";
import SettingsMenu from "./components/SettingsMenu";
import MobileMenu from "./components/MobileMenu";
import SensorCompare from "./states/SensorCompare";
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

const subscriptionText = {
  fontFamily: "mulish",
  fontSize: 16,
  color: "#8A9E9A",
  fontWeight: "bold",
  marginTop: -15
}


let currColorMode;
function ColorModeSwitch() {
  const { t } = useTranslation();
  const { colorMode, toggleColorMode } = useColorMode()
  const [isMobile] = useMediaQuery("(max-width: 1023px)", { ssr: false })

  if (currColorMode !== colorMode) {
    currColorMode = colorMode;
    try {
      document.querySelector('meta[name="theme-color"]').setAttribute("content", ruuviTheme.newColors.bodyBg[currColorMode].replace(" !important", ""));
    } catch (error) {
    }
  }
  return (
    <>
      <Tooltip key="color_mode_tooltip" label={t("color_mode_tooltip")} hasArrow isDisabled={isMobile}>
        <IconButton variant="ghost" style={{ marginRight: 0 }} onClick={() => toggleColorMode()}>
          {colorMode === 'light' ? <MdOutlineNightlight /> : <SunIcon />}
        </IconButton>
      </Tooltip>
    </>
  )
}

function Logo(props) {
  const { colorMode } = useColorMode()
  let ruuviLogo = colorMode === "light" ? logo : logoDark
  return (
    <>
      <Image alt="logo" height={30} src={ruuviLogo} fit="scale-down" style={{ cursor: "pointer" }} onClick={() => window.location.href = "/"} />
      <span style={subscriptionText}>
        {props.subscription.split(" ")[0]}
      </span>
    </>
  )
}

function loadInitalSettings(forceUpdate, browserLang) {
  new NetworkApi().getSettings(settings => {
    if (settings.result === "success") {
      localStorage.setItem("settings", JSON.stringify(settings.data.settings))
      let settingsLng = settings.data.settings.PROFILE_LANGUAGE_CODE
      i18next.changeLanguage(settingsLng || browserLang)
      if (!settingsLng) {
        new NetworkApi().setSetting("PROFILE_LANGUAGE_CODE", browserLang)
      }
    } else if (settings.result === "error" && settings.code === "ER_UNAUTHORIZED") {
      logout(forceUpdate)
    }
  })
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
    window.location.href = window.location.href.split("?")[0];
    /*
    const supportedLangs = ["en", "fi", "sv"]
    let lng = params.lng.split("-")[0]
    if (supportedLangs.indexOf(lng) > -1) {
      localStorage.setItem("selected_language", lng)
      i18next.changeLanguage(lng)
    }
    */
  }

  let browserLanguage = navigator.language || navigator.userLanguage;
  browserLanguage = browserLanguage.substring(0, 2)

  let { t, i18n } = useTranslation()

  const [showDialog, setShowDialog] = useState("")

  var user = new NetworkApi().getUser()
  const [reloadSub, setReloadSub] = React.useState(0);
  const [subscription, setSubscription] = useState("")
  useEffect(() => {
    async function getSubs() {
      if (user) {
        let resp = await new NetworkApi().getSubscription()
        if (resp.result === "success") {
          if (resp.data.subscriptions.length === 0) return setSubscription("none")
          return setSubscription(resp.data.subscriptions[0].subscriptionName)
        }
      }
      setTimeout(() => {
        getSubs()
      }, 5000)
    }
    getSubs()
  }, [reloadSub]);
  const [banners, setBanners] = React.useState(null);
  useEffect(() => {
    if (!subscription) return
    (async () => {
      try {
        let store = new Store();
        let notifications = await new NetworkApi().getBanners();
        if (notifications) {
          let notification = notifications.filter(x => x.plan === subscription || x.plan === "")
          notification = notification.filter(x => x.key && !store.getHasSeenBanner(x.key))
          notification = notification.filter(x => {
            if (x.version && x.version !== pjson.version) return false
            return true
          });
          if (notification && notification.length) setBanners(notification)
          else if (banners !== null) setBanners(null)
        }
      } catch (e) {
        console.log("Could not get notifications", e)
      }
    })()
  }, [subscription])

  const forceUpdate = React.useCallback(() => updateState({}), []);

  useEffect(() => {
    if (!user) return
    loadInitalSettings(forceUpdate, browserLanguage)
  }, []);

  let store = new Store();
  const [, updateState] = React.useState();
  if (!user) {
    //goToLoginPage()
    return <ChakraProvider theme={ruuviTheme} style={{ minHeight: "100%" }}>
      <BrowserRouter>
        <SignIn loginSuccessful={data => {
          forceUpdate()
          loadInitalSettings(forceUpdate, browserLanguage)
        }} />
      </BrowserRouter>
    </ChakraProvider>
  }

  let getBannerContent = (notification) => {
    let lang = i18n.language || "en"
    return notification[lang] || notification.en
  }

  // get hideTopBar from query params
  let hideTopBar = window.location.search.includes("minimalMode=true")

  return (
    <ChakraProvider theme={ruuviTheme}>
      <BrowserRouter basename={"/"}>
        {hideTopBar ? null : <>
          <HStack className="topbar" style={{ paddingLeft: "14px", paddingRight: "14px" }} height="60px">
            <Logo subscription={subscription} />
            <Text>
              {new NetworkApi().isStaging() ? "(staging) " : ""}
            </Text>
            <span style={{ width: "100%", textAlign: "right", marginLeft: "-25px", marginRight: "-4px" }}>
              <TopBar user={user} reloadSub={reloadSub} setShowDialog={setShowDialog} />
            </span>
          </HStack>
          {banners && banners.map(x => {
            return <HStack className="banner" style={{ paddingLeft: "18px", paddingRight: "18px" }}>
              <Box flex style={{ textAlign: "center", width: "100%" }} dangerouslySetInnerHTML={{ __html: getBannerContent(x) }}></Box>
              <Box flex style={{ width: "16px" }}>
                <div style={{ cursor: "pointer" }} onClick={() => {
                  store.setHasSeenBanner(x.key, true)
                  let rest = banners.filter(y => y.key !== x.key)
                  setBanners(rest);
                }}>
                  <IoClose size={24} color="#0aa08a" />
                </div>
              </Box>
            </HStack>
          })}
        </>}
        <div>
          <Routes>
            <Route path="/shares" element={<ShareCenter showDialog={showDialog} closeDialog={() => setShowDialog("")} />} />
            <Route path="/:id" element={<Dashboard reloadTags={() => { setReloadSub(reloadSub + 1); forceUpdate() }} showDialog={showDialog} closeDialog={() => setShowDialog("")} />} />
            <Route path="/" element={<Dashboard reloadTags={() => { setReloadSub(reloadSub + 1); forceUpdate() }} showDialog={showDialog} closeDialog={() => setShowDialog("")} />} />
            <Route path="/compare" element={<SensorCompare />} />
          </Routes>
          <div style={bottomText}><a href={i18n.language === "fi" ? "https://ruuvi.com/fi" : "https://ruuvi.com/"} target="_blank" rel="noreferrer">ruuvi.com</a></div>
          <div style={supportLink}><a href={i18n.language === "fi" ? "https://ruuvi.com/fi/tuki" : "https://ruuvi.com/support"}>{t("support")}</a></div>
          <div style={versionText}>v{pjson.version} <a href="https://f.ruuvi.com/t/5039/9999" target="_blank" rel="noreferrer">{t("changelog")}</a></div>
        </div>
      </BrowserRouter>
      <AddSensorModal open={showDialog === "addsensor"} onClose={() => setShowDialog("")} updateApp={() => { setReloadSub(reloadSub + 1); forceUpdate() }} />
      <SettingsModal open={showDialog === "settings"} onClose={() => setShowDialog("")} />
      {showDialog === "myaccount" &&
        <MyAccountModal open={true} onClose={() => setShowDialog("")} updateApp={() => { setReloadSub(reloadSub + 1); forceUpdate() }} />
      }
    </ChakraProvider>
  );
}

function TopBar({ reloadSub, setShowDialog, user }) {
  const isWideVersion = useBreakpointValue({ base: false, md: true })
  let sensorMenu = <SensorMenu key={reloadSub} small={!isWideVersion}
    addSensor={() => {
      setShowDialog("addsensor")
    }}
  />
  const nav = useNavigate()
  return <>
    {isWideVersion ?
      <>
        <Button variant="topbar" onClick={() => nav("/")} className={window.location.href.endsWith("/") ? "activeNav" : ""}>
          {i18next.t("home")}
        </Button>
        <Button variant="topbar" onClick={() => nav("/compare")} className={window.location.href.indexOf("/compare") !== -1 ? "activeNav" : ""}>
          {i18next.t("compare")}
        </Button>
        <Button variant="topbar" onClick={() => nav("/shares")} className={window.location.href.indexOf("/shares") !== -1 ? "activeNav" : ""}>
          {i18next.t("share_center")}
        </Button>
        {sensorMenu}
        <SettingsMenu openSettings={() => setShowDialog("settings")} />
        <UserMenu settings={() => setShowDialog("settings")} myAccount={() => setShowDialog("myaccount")} />
      </>
      :
      <>
        {sensorMenu}
        <MobileMenu openSettings={() => setShowDialog("settings")} myAccount={() => setShowDialog("myaccount")} />
      </>
    }

  </>
}