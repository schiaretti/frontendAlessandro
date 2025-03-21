// App.jsx (ou App.js)
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Cadastro from './pages/Cadastro';
import Login from './pages/Login'
import ErrorBoundary from './components/ErrorBoundary';


function App() {
  return (
    <BrowserRouter>
    <ErrorBoundary>
      <Routes>
        <Route path="/cadastro" element={<Cadastro/>} />
        <Route path='/login' element={<Login/>} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;