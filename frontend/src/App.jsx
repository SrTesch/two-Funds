import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import JointAccount from './pages/JointAccount';
import Historico from './pages/Historico';
import Cartoes from './pages/Cartoes';
import BottomNav from './components/BottomNav';
import './index.css';

const AppLayout = () => {
  return (
    <>
      <div style={{ paddingBottom: '70px' }}>
        <Outlet />
      </div>
      <BottomNav />
    </>
  );
};

function App() {
  return (
    <Router>
      <div className="bg-blob blob-1"></div>
      <div className="bg-blob blob-2"></div>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/historico" element={<Historico />} />
          <Route path="/cartoes" element={<Cartoes />} />
          <Route path="/joint" element={<JointAccount />} />
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
