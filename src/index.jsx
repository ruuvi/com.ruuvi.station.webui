import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import 'typeface-montserrat';
import 'typeface-mulish';
import 'typeface-oswald';
import './i18n';
import logo from './img/ruuvi-vector-logo.svg'
import seriousPhone from './img/with-phone-serious-500.png'
import { createStandaloneToast } from '@chakra-ui/toast'
import { t } from 'i18next';
const { ToastContainer } = createStandaloneToast()

class ErrorView extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.log(error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <center style={{ color: "white" }}>
          <br />
          <img src={logo} alt='logo' width={"100px"} />
          <br />
          <br />
          <img src={seriousPhone} alt='serious-mascot' width={"300px"} />
          <h1>{t("something_went_wrong")}</h1>
          <p>{t("try_refreshing_page")}</p>
        </center>
      );
    }

    return this.props.children;
  }
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Suspense fallback={
    <center style={{ width: "100%", marginTop: 100 }}>
      <span className='spinner'></span>
    </center>
  }>
    <ErrorView>
      <App />
    </ErrorView>
    <ToastContainer />
  </Suspense>,
  document.getElementById('root')
);