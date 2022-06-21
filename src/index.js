import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
//import reportWebVitals from './reportWebVitals';
import 'typeface-montserrat';
import 'typeface-mulish';
import 'typeface-oswald';
import './i18n';
import { createStandaloneToast } from '@chakra-ui/toast'
const { ToastContainer } = createStandaloneToast()


ReactDOM.render(
  <React.StrictMode>
    <Suspense fallback={
      <center style={{ width: "100%", marginTop: 100 }}>
        <span className='spinner'></span>
      </center>
    }>
      <App />
      <ToastContainer />
    </Suspense>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
//reportWebVitals();
