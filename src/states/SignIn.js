import React, { Component } from "react";
import logo from '../img/ruuvi-vector-logo.svg'
import NetworkApi from '../NetworkApi'
import { Center, GridItem, Heading, HStack, SimpleGrid } from "@chakra-ui/react"
import { Stack, Image } from "@chakra-ui/react"
import { Input, Text } from "@chakra-ui/react"
import { Button } from "@chakra-ui/react"
import { CircularProgress, SlideFade } from "@chakra-ui/react"
import { PinInput, PinInputField } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import LanguageMenu from "../components/LanguageMenu";

const loginText = {
    fontFamily: "montserrat",
    fontWeight: 800,
    fontSize: 36,
}
const infoText = {
    fontFamily: "mulish",
    fontSize: 16,
}
const buttonText = {
    fontFamily: "montserrat",
    fontWeight: "bold",
    fontSize: 16,
}
const sideBackground = {
    backgroundColor: "gray",
    backgroundImage: "url('https://ruuvi.com/i/u/station-bg.jpg')",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "cover",
}

class SignIn extends Component {
    constructor(props) {
        super(props)
        this.state = {
            email: "",
            validationCode: "",
            pageState: 0,
            loading: false,
        }
    }
    register() {
        this.setState({ ...this.state, loading: true })
        new NetworkApi().register(this.state.email, resp => {
            if (resp.result === "error") {
                alert(resp.error)
                this.setState({ ...this.state, pageState: 0, loading: false })
                return
            }
            this.setState({ ...this.state, pageState: 1, loading: false })
        }, () => {
            alert("Network error")
            this.setState({ ...this.state, pageState: 0, loading: false })
        })
    }
    validate() {
        this.setState({ ...this.state, loading: true })
        var api = new NetworkApi();
        api.verify(this.state.validationCode, resp => {
            if (resp.result === "error") {
                alert(resp.error)
                this.setState({ ...this.state, pageState: 0, loading: false, validationCode: "" })
                return
            }
            var user = resp.data;
            api.setUser(user)
            this.props.loginSuccessful(user)
        }, () => {
            alert("Network error")
            this.setState({ ...this.state, pageState: 0, loading: false })
        })
    }
    render() {
        const { i18n, t } = this.props;
        return (
            <SimpleGrid columns={{ sm: 1, md: 2 }} style={{ minHeight: "100%" }}>
                <GridItem>
                    <Center style={{ width: "100%" }}>
                        <Stack spacing="24px">
                            <Center style={{ width: "100%" }}>
                                <Image alt="logo" width={100} src={logo} fit="scale-down" style={{ height: "200px" }} />
                            </Center>
                            <Center style={{ width: "100%" }}>
                                <div style={{ width: "75%" }}>
                                    <center>
                                        <LanguageMenu loginPage={true} />
                                    </center>
                                    <Heading style={loginText}>
                                        {t("login_to_ruuvi_station")} {new NetworkApi().isStaging() ? "(staging)" : ""}
                                    </Heading>
                                    {this.state.loading ? (
                                        <SlideFade initialScale={1} in={this.state.loading} unmountOnExit style={{ textAlign: "center" }}>
                                            <CircularProgress isIndeterminate color="teal" />
                                        </SlideFade>
                                    ) : (
                                        <span>
                                            {this.state.pageState === 0 &&
                                                <SlideFade initialScale={1} in={this.state.pageState === 0} unmountOnExit>
                                                    <Stack spacing="12px">
                                                        <Text style={infoText}>
                                                            {t("type_your_email")}
                                                        </Text>
                                                        <Input placeholder={t("email")} value={this.state.email} onChange={e => this.setState({ ...this.state, email: e.target.value })} />
                                                        <Button colorScheme="teal" onClick={this.register.bind(this)} style={buttonText}>{t("login")}</Button>
                                                    </Stack>
                                                </SlideFade>
                                            }
                                            {this.state.pageState === 1 &&
                                                <SlideFade initialScale={0} in={this.state.pageState === 1} unmountOnExit>
                                                    <Stack spacing="12px">
                                                        <Text>
                                                            {t("sign_in_check_email")}
                                                    </Text>
                                                        <HStack style={{ marginLeft: "50px" }}>
                                                            <PinInput type="alphanumeric" value={this.state.validationCode} onChange={e => this.setState({ ...this.state, validationCode: e })}>
                                                                <PinInputField />
                                                                <PinInputField />
                                                                <PinInputField />
                                                                <PinInputField />
                                                            </PinInput>
                                                        </HStack>
                                                        <Button colorScheme="teal" onClick={this.validate.bind(this)} style={buttonText}>{t("submit")}</Button>
                                                    </Stack>
                                                </SlideFade>
                                            }
                                        </span>
                                    )}
                                </div>
                            </Center>
                        </Stack>
                    </Center>
                </GridItem>
                <GridItem style={sideBackground}></GridItem>
            </SimpleGrid>
        )
    }
}

export default withTranslation()(SignIn);