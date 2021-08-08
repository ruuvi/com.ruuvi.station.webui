import React from "react";
import {
  Switch,
  Route,
  HashRouter
} from "react-router-dom";
import NetworkApi from "./NetworkApi";
import SignIn from "./states/SignIn";
import logo from './img/ruuvi-vector-logo.svg'

import { ChakraProvider, Text, HStack, Image } from "@chakra-ui/react"
import Dashboard from "./states/Dashboard";
import { extendTheme } from "@chakra-ui/react"
import UserMenu from "./components/UserMenu";
import SensorMenu from "./components/SensorMenu";
import LanguageMenu from "./components/LanguageMenu";

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: "#e6f6f2",
      },
    }
  },
  colors: {
    brand: {
      100: "#f7fafc",
      900: "#1a202c",
    },
  },
})

const bottomText = {
  width: "100%",
  textAlign: "center",
  padding: "20px",
  fontFamily: "mulish",
  fontSize: 18,
  fontWeight: 800,
  color: "#c8dbd9",
}

export default function App() {
  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);
  const logout = () => {
    new NetworkApi().removeToken()
    forceUpdate()
  }
  var user = new NetworkApi().getUser()
  var sensors = [];
  if (!user) {
    return <ChakraProvider theme={theme} style={{ minHeight: "100%" }}>
      <SignIn loginSuccessful={data => {
        forceUpdate()
      }} />
    </ChakraProvider>
  }
  new NetworkApi().getSettings(settings => {
    if (settings.result === "success")
      localStorage.setItem("settings", JSON.stringify(settings.data.settings))
  })
  return (
    <ChakraProvider theme={theme}>
      <HashRouter>
        <HStack style={{ backgroundColor: "white", boxShadow: "0px 1px 2px #dddddd", paddingLeft: "25px", paddingRight: "25px" }} height="60px">
          <a href="#">
            <Image alt="logo" height={30} src={logo} fit="scale-down" />
          </a>
          <Text>
            {new NetworkApi().isStaging() ? "(staging) " : ""}
          </Text>
          <span style={{ width: "100%", textAlign: "right" }}>
            <SensorMenu sensors={sensors} />
            <LanguageMenu />
            <UserMenu logout={logout} email={user.email} />
          </span>
        </HStack>
        <div style={{ marginTop: "20px" }}>
          <Switch>
            <Route path="/:id" component={Dashboard} />
            <Route path="/" component={Dashboard} />
          </Switch>
          <div style={bottomText}>ruuvi.com</div>
        </div>
      </HashRouter>
    </ChakraProvider>
  );
}