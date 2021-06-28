import React from "react";
import {
  Switch,
  Route,
  HashRouter
} from "react-router-dom";
import NetworkApi from "./NetworkApi";
import SignIn from "./states/SignIn";

import { ChakraProvider, Button, Text, HStack } from "@chakra-ui/react"
import Dashboard from "./states/Dashboard";

export default function App() {
  const [, updateState] = React.useState();
  const forceUpdate = React.useCallback(() => updateState({}), []);
  const logout = () => {
    new NetworkApi().removeToken()
    forceUpdate()
  }
  const seeSettings = () => {
    new NetworkApi().getSettings(settings => {
      alert(JSON.stringify(settings, null, 2))
    })
  }
  const seeAlerts = () => {
    new NetworkApi().getAlerts(alerts => {
      alert(JSON.stringify(alerts, null, 2))
    })
  }
  var user = new NetworkApi().getUser()
  if (!user) {
    return <ChakraProvider>
      <SignIn loginSuccessful={data => {
        forceUpdate()
      }} />
    </ChakraProvider>
  }
  return (
    <ChakraProvider>
      <HashRouter>
        <HStack>
          <Text>
            {new NetworkApi().isStaging() ? "(staging) " : ""}
            {user.email}
          </Text>
          <Button size="sm" onClick={() => seeSettings()}>See settings</Button>
          <Button size="sm" onClick={() => seeAlerts()}>See alerts</Button>
          <Button size="sm" onClick={() => logout()}>Logout</Button>
        </HStack>
        <div style={{ marginTop: "20px" }}>
          <Switch>
            <Route path="/:id" component={Dashboard} />
            <Route path="/" component={Dashboard} />
          </Switch>
        </div>
      </HashRouter>
    </ChakraProvider>
  );
}