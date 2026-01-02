import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// Se der erro na linha abaixo, apague ela e a chamada reportWebVitals() no final
// import reportWebVitals from './reportWebVitals'; 

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Se você tiver o arquivo reportWebVitals, descomente a linha abaixo
// reportWebVitals();