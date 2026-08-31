import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { ServiceWorkerRegister } from './ServiceWorkerRegister';
createRoot(document.getElementById('root')!).render(<><App/><ServiceWorkerRegister/></>);
