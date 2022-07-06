import React from "react";
import {
  Switch,
  Route,
  HashRouter
} from "react-router-dom";
import NetworkApi from "./NetworkApi";
import logo from './img/ruuvi-vector-logo.svg'
import logoDark from './img/ruuvi-vector-logo-dark.svg'
import { ChakraProvider, Text, HStack, Image, useColorMode, IconButton } from "@chakra-ui/react"
import { ruuviTheme } from "./themes";
import pjson from "./../package.json"
import i18next from "i18next";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";
const SignIn = React.lazy(() => import("./states/SignIn"));
const Dashboard = React.lazy(() => import("./states/Dashboard"));
const UserMenu = React.lazy(() => import("./components/UserMenu"));
const SensorMenu = React.lazy(() => import("./components/SensorMenu"));
const LanguageMenu = React.lazy(() => import("./components/LanguageMenu"));


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
  fontSize: 16,
  fontWeight: 600,
  color: "#c8dbd9",
  marginTop: -4,
  paddingBottom: 20,
}


function ColorModeSwitch() {
  const { colorMode, toggleColorMode } = useColorMode()
  return (
    <>
      <IconButton variant="ghost" onClick={toggleColorMode}>{colorMode === 'light' ? <MoonIcon /> : <SunIcon />}</IconButton>
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
  if (params.lang) {
    const supportedLangs = ["en", "fi", "sv"]
    if (supportedLangs.indexOf(params.lang) > -1) {
      localStorage.setItem("selected_language", params.lang)
      i18next.changeLanguage(params.lang)
      window.location.href = window.location.href.split("?")[0];
    }
  }

  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);
  const logout = () => {
    new NetworkApi().removeToken()
    window.location.replace("/#/")
    //window.location.href = "https://ruuvi.com/station"
    forceUpdate()
  }
  var user = new NetworkApi().getUser()
  var sensors = [];
  if (!user) {
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
      <HashRouter>
        <HStack className="topbar" style={{ paddingLeft: "18px", paddingRight: "18px" }} height="60px">
          <Logo />
          <Text>
            {new NetworkApi().isStaging() ? "(staging) " : ""}
          </Text>
          <span style={{ width: "100%", textAlign: "right" }}>
            <ColorModeSwitch />
            <SensorMenu sensors={sensors} key={Math.random()} />
            <LanguageMenu />
            <UserMenu logout={logout} settings={() => window.location.href += "?settings"} email={user.email} />
          </span>
        </HStack>
        <div>
          <Switch>
            <Route path="/:id" render={rp => <Dashboard reloadTags={() => { forceUpdate() }} {...rp} />} />
            <Route path="/" render={rp => <Dashboard reloadTags={() => { forceUpdate() }} {...rp} />} />
          </Switch>
          <div style={bottomText}><a href="https://ruuvi.com/" target="_blank" rel="noreferrer">ruuvi.com</a></div>
          <div style={versionText}>v{pjson.version}</div>
        </div>
      </HashRouter>
    </ChakraProvider>
  );
}