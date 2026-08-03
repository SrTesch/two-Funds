import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, History, CreditCard, User } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard', label: 'Início', icon: <Home size={24} /> },
    { path: '/historico', label: 'Histórico', icon: <History size={24} /> },
    { path: '/cartoes', label: 'Faturas', icon: <CreditCard size={24} /> },
    { path: '/profile', label: 'Perfil', icon: <User size={24} /> }
  ];

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(10px)',
      borderTop: '1px solid rgba(0,0,0,0.05)',
      display: 'flex',
      justifyContent: 'space-around',
      padding: '12px 0',
      zIndex: 100
    }}>
      {navItems.map(item => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textDecoration: 'none',
              color: isActive ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'color 0.3s'
            }}
          >
            {item.icon}
            <span style={{ fontSize: '0.7rem', marginTop: '4px', fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
          </Link>
        )
      })}
    </div>
  );
};

export default BottomNav;
