import React, { Component } from "react";
import logo from '../img/ruuvi-vector-logo.svg'
import NetworkApi from '../NetworkApi'
import { Center, Heading, HStack } from "@chakra-ui/react"
import { Stack, Image } from "@chakra-ui/react"
import { Input, Text } from "@chakra-ui/react"
import { Button } from "@chakra-ui/react"
import { CircularProgress, SlideFade } from "@chakra-ui/react"
import { PinInput, PinInputField } from "@chakra-ui/react"
import { withTranslation } from 'react-i18next';
import LanguageMenu from "../components/LanguageMenu";
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
        return (
            <Center style={{ width: "100%" }}>
                <Stack spacing="24px">
                    <Center style={{ width: "100%" }}>
                        <Image alt="logo" width={100} src={logo} fit="scale-down" style={{ height: "200px" }} />
                    </Center>
                    <center>
                        <div style={{ width: "80%" }}>
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
                                                <Input className="signinInput" placeholder={t("email")} autocomplete="email" type="email" value={this.state.email} onChange={e => this.setState({ ...this.state, email: e.target.value })} autoFocus onKeyDown={this.emailKeyDown.bind(this)} />
                                                <Button isDisabled={!this.emailIsValid()} onClick={this.register.bind(this)} style={buttonText}>{t("login")}</Button>
                                            </Stack>
                                        </SlideFade>
                                    }
                                    {this.state.pageState === 1 &&
                                        <SlideFade initialScale={0} in={this.state.pageState === 1} unmountOnExit>
                                            <Stack spacing="12px">
                                                <Text>
                                                    {t("sign_in_check_email")}
                                                </Text>
                                                <HStack>
                                                    <div style={{ textAlign: "center", width: "100%" }}>
                                                        <PinInput type="alphanumeric" focusBorderColor="#1f9385" value={this.state.validationCode} onChange={code => this.updateValidationCode(code)} autoFocus>
                                                            {Array(4).fill().map(() => {
                                                                return <PinInputField style={{ margin: 5 }} />
                                                            })}
                                                        </PinInput>
                                                    </div>
                                                </HStack>
                                                {/*<Button colorScheme="teal" onClick={this.validate.bind(this)} style={buttonText}>{t("submit")}</Button>*/}
                                            </Stack>
                                        </SlideFade>
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