import React from 'react';
import {createRoot} from 'react-dom/client';
import ProductionSchool from './production-school';
import CentralDemo from './central-demo';
import './globals.css';
import './extra.css';
const App = import.meta.env.DEV && !new URLSearchParams(location.search).has('live') && !new URLSearchParams(location.search).has('legacy') ? CentralDemo : ProductionSchool;
// Numeric fields accept Persian, Arabic and Latin digits. Normalize before React reads the input.
document.addEventListener('input',event=>{const input=event.target as HTMLInputElement;if(!(input instanceof HTMLInputElement)||(!['numeric','decimal','tel'].includes(input.inputMode)&&input.type!=='number'))return;const normalized=input.value.replace(/[۰-۹]/g,c=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g,c=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)));if(normalized!==input.value)input.value=normalized},true);
createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
if(!import.meta.env.DEV&&'serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
