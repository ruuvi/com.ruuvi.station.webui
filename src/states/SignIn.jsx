import React, { Component } from "react";
import logo from '../img/ruuvi-vector-logo.svg'
import NetworkApi from '../NetworkApi'
import { Box, Center, Heading, HStack, Stack, Image, Input, Text, Button, PinInput } from "@chakra-ui/react"
import { CircleProgress } from "../components/ui/progress"
import { withTranslation } from 'react-i18next';
import LanguageMenu from "../components/menus/LanguageMenu";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";


const loginText = {
    fontFamily: "montserrat",
    fontWeight: 800,
    fontSize: 36,
    paddingTop: 18,
    paddingBottom: 18,
}
const infoText = {
    fontFamily: "mulish",
    fontSize: 16,
    paddingBottom: 18,
}
const buttonText = {
    fontFamily: "montserrat",
    fontWeight: "bold",
    fontSize: 16,
}

// v3 dropped the transition components; the enter animation is a keyframe pair
const slideFade = {
    animationName: "slide-from-bottom, fade-in",
    animationDuration: "moderate",
}

const CODE_LENGTH = 4

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
    componentDidMount() {
        if (this.props.searchParams[0].has("token")) {
            let token = this.props.searchParams[0].get("token")
            this.props.navigate({
                pathname: '/',
                search: ''
            }, { replace: true })
            if (token) {
                this.setState({ ...this.state, validationCode: token, loading: true }, () => {
                    this.validate()
                })
            }
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
    updateValidationCode(code) {
        this.setState({ ...this.state, validationCode: code.toUpperCase() }, () => {
            if (this.state.validationCode.length === 4) {
                this.validate();
            }
        })
    }
    emailIsValid() {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.state.email)
    }
    emailKeyDown = (e) => {
        if (e.key === 'Enter' && this.emailIsValid()) {
            this.register();
        }
    }
    render() {
        const { t } = this.props;
        const codeChars = Array.from({ length: CODE_LENGTH }, (_, i) => this.state.validationCode[i] || "")
        let isStaging = new NetworkApi().isStaging()
        return (
            <Center style={{ width: "100%" }}>
                <Stack gap="24px">
                    <Center style={{ width: "100%" }}>
                        <Image alt="logo" width={100} src={logo} fit="scale-down" style={{ height: "200px" }} />
                    </Center>
                    <center>
                        <div style={{ width: "80%" }}>
                            <center>
                                <LanguageMenu loginPage={true} />
                            </center>
                            <Heading style={loginText}>
                                {t("login_to_ruuvi_station")} {isStaging ? "(staging)" : ""}
                            </Heading>
                            {isStaging &&
                                <Button mb={4} onClick={() => {
                                    new NetworkApi().setEnv("production")
                                    window.location.reload()
                                }
                                } style={buttonText}>For development purposes, click here for production.</Button>
                            }
                            {this.state.loading ? (
                                <Box {...slideFade} style={{ textAlign: "center" }}>
                                    {/* v2 resolved color="teal" to teal.500 (#319795); v3 would emit the
                                        CSS named colour, and its own teal ramp differs anyway */}
                                    <CircleProgress thickness="4.8px" color="#319795" trackColor="#edebe9" />
                                </Box>
                            ) : (
                                <span>
                                    {this.state.pageState === 0 &&
                                        <Box {...slideFade}>
                                            <Stack gap="12px">
                                                <Text style={infoText}>
                                                    {t("type_your_email")}
                                                </Text>
                                                <Input className="signinInput" placeholder={t("email")} autoComplete="email" type="email" value={this.state.email} onChange={e => this.setState({ ...this.state, email: e.target.value.toLowerCase() })} autoFocus onKeyDown={this.emailKeyDown.bind(this)} />
                                                <Button disabled={!this.emailIsValid()} onClick={this.register.bind(this)} style={buttonText}>{t("login")}</Button>
                                            </Stack>
                                        </Box>
                                    }
                                    {this.state.pageState === 1 &&
                                        <Box {...slideFade}>
                                            <Stack gap="12px">
                                                <Text>
                                                    {t("sign_in_check_email")}
                                                </Text>
                                                <HStack>
                                                    <div style={{ textAlign: "center", width: "100%" }}>
                                                        <PinInput.Root type="alphanumeric" count={CODE_LENGTH} value={codeChars} onValueChange={e => this.updateValidationCode(e.value.join(""))} autoFocus>
                                                            <PinInput.Control display="inline-flex" gap={0}>
                                                                {Array.from({ length: CODE_LENGTH }, (_, i) => (
                                                                    <PinInput.Input key={i} index={i} style={{ margin: 5 }} />
                                                                ))}
                                                            </PinInput.Control>
                                                            <PinInput.HiddenInput />
                                                        </PinInput.Root>
                                                    </div>
                                                </HStack>
                                                {/*<Button colorPalette="teal" onClick={this.validate.bind(this)} style={buttonText}>{t("submit")}</Button>*/}
                                            </Stack>
                                        </Box>
                                    }
                                </span>
                            )}
                        </div>
                    </center>
                </Stack>
            </Center>
        )
    }
}

export default withTranslation()((props) => (
    <SignIn
        {...props}
        params={useParams()}
        navigate={useNavigate()}
        searchParams={useSearchParams()}
    />
));