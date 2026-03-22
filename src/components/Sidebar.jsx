import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Menu, X } from 'lucide-react';

const navGroups = [
  {
    title: 'GERAL',
    links: [
      { to: '/', icon: '🧠', label: 'Dashboard', color: '#7c6aff' },
    ],
  },
  {
    title: 'FINANÇAS',
    links: [
      { to: '/contas', icon: '🏦', label: 'Contas', color: '#00d4ff' },
      { to: '/entradas', icon: '↓', label: 'Entradas', color: '#00e676', isText: true },
      { to: '/saidas', icon: '↑', label: 'Saídas', color: '#ff4757', isText: true },
      { to: '/programacoes', icon: '📅', label: 'Programações', color: '#ffd32a' },
      { to: '/dividas', icon: '💸', label: 'Dívidas', color: '#ff9f43' },
      { to: '/importar-ofx', icon: '📥', label: 'Importar OFX', color: '#00d4ff' },
    ],
  },
  {
    title: 'VIDA & SAÚDE',
    links: [
      { to: '/academia', icon: '💪', label: 'Academia', color: '#a2ff00' },
      { to: '/metas', icon: '🎯', label: 'Metas', color: '#ff6a9b' },
    ],
  },
  {
    title: 'PRODUTIVIDADE',
    links: [
      { to: '/tarefas', icon: '✅', label: 'Tarefas', color: '#00e5ff' },
      { to: '/projetos', icon: '📁', label: 'Projetos', color: '#ffd32a' },
      { to: '/agenda', icon: '🗓️', label: 'Agenda', color: '#b2bec3' },
    ],
  },
  {
    title: 'SISTEMA NERVO',
    links: [
      { to: '/anotacoes', icon: '📝', label: 'Anotações', color: '#ffffff' },
      { to: '/assistente', icon: '⚡', label: 'Assistente IA', color: 'gradient', isText: true },
      { to: '/configuracoes', icon: '⚙️', label: 'Configurações', color: '#8888aa' },
    ],
  },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const closeMobile = () => setMobileOpen(false);
  
  return (
    <>
      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          height: 100vh;
          position: fixed;
          top: 0; left: 0;
          background: #0e0e18;
          border-right: 1px solid #252538;
          display: flex;
          flex-direction: column;
          z-index: 100;
        }

        .sidebar-header {
          padding: 24px 20px 16px;
        }

        .neural-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .neural-icon-wrapper {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .neural-icon-pulse {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,106,255,0.4) 0%, transparent 70%);
          animation: pulseGlow 2s infinite ease-in-out;
        }

        @keyframes pulseGlow {
          0% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.4; transform: scale(0.8); }
        }

        .brand-text h2 {
          font-family: var(--font-heading);
          font-size: 1.05rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--text), var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-text span {
          display: block;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--accent);
          letter-spacing: 1px;
          margin-top: 2px;
        }

        .gradient-divider {
          height: 1px;
          background: linear-gradient(90deg, var(--accent) 0%, transparent 100%);
          margin-bottom: 20px;
          opacity: 0.5;
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--surface2);
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.03);
        }

        .avatar-wrapper {
          position: relative;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          padding: 2px;
          background: linear-gradient(135deg, var(--accent), var(--accent2));
        }

        .avatar-inner {
          width: 100%;
          height: 100%;
          background: var(--surface);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .online-dot {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 12px;
          height: 12px;
          background: var(--green);
          border: 2px solid var(--surface2);
          border-radius: 50%;
          animation: pulseGreen 2s infinite;
        }

        @keyframes pulseGreen {
          0% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0.4); }
          70% { box-shadow: 0 0 0 4px rgba(0, 230, 118, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 230, 118, 0); }
        }

        .user-info h3 {
          font-family: var(--font-heading);
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .user-info p {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 0 12px;
        }

        .sidebar-nav::-webkit-scrollbar { width: 4px; }
        .sidebar-nav::-webkit-scrollbar-thumb { background: #252538; border-radius: 4px; }

        .nav-group {
          margin-bottom: 24px;
        }

        .nav-group-title {
          font-family: var(--font-mono);
          font-size: 0.6rem;
          font-weight: 600;
          color: var(--text3);
          letter-spacing: 1.5px;
          padding-left: 12px;
          margin-bottom: 8px;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s ease;
          position: relative;
          margin-bottom: 2px;
        }

        .nav-link::before {
          content: '';
          position: absolute;
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          height: 0;
          width: 3px;
          background: var(--accent);
          border-radius: 0 4px 4px 0;
          transition: all 0.2s ease;
        }

        .nav-link:hover {
          background: rgba(255,255,255,0.03);
          color: var(--text);
        }

        .nav-link.active {
          background: linear-gradient(90deg, rgba(124,106,255,0.1) 0%, transparent 100%);
          color: var(--text);
        }

        .nav-link.active::before {
          height: 70%;
          box-shadow: 0 0 10px var(--accent);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          font-size: 1.1rem;
          transition: all 0.2s ease;
        }

        .nav-link:hover .nav-icon {
          transform: scale(1.1);
        }

        .nav-link.active .nav-icon {
          filter: drop-shadow(0 0 8px currentColor);
        }

        .sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-logout {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-logout:hover {
          color: var(--red);
        }

        /* === HAMBURGER BUTTON (Mobile) === */
        .hamburger-btn {
          display: none;
          position: fixed;
          top: 16px;
          left: 16px;
          z-index: 200;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--text);
          cursor: pointer;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4);
          transition: all 0.2s;
        }

        .hamburger-btn:hover {
          background: var(--surface2);
          border-color: var(--accent);
        }

        .sidebar-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(4px);
          z-index: 99;
        }

        /* === MOBILE RESPONSIVE === */
        @media (max-width: 1024px) {
          .hamburger-btn {
            display: flex;
          }

          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: none;
            width: 280px;
          }

          .sidebar.mobile-open {
            transform: translateX(0);
            box-shadow: 8px 0 30px rgba(0,0,0,0.5);
          }

          .sidebar-overlay.visible {
            display: block;
            animation: fadeIn 0.2s ease forwards;
          }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      
      {/* Hamburger Button */}
      <button
        className="hamburger-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
        onClick={closeMobile}
      />

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="neural-logo">
            <div className="neural-icon-wrapper">
              <div className="neural-icon-pulse"></div>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'relative', zIndex: 2 }}>
                 <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                 <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
            </div>
            <div className="brand-text">
              <h2>Segundo Cérebro</h2>
              <span>v1.0 NEURAL</span>
            </div>
          </div>
          
          <div className="gradient-divider"></div>

          <div className="user-card">
            <div className="avatar-wrapper">
              <div className="avatar-inner">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={16} color="var(--text-secondary)" />
                )}
              </div>
              <div className="online-dot"></div>
            </div>
            <div className="user-info">
              <h3>{user?.displayName || 'Sem Nome'}</h3>
              <p>{user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  style={({ isActive }) => ({ color: isActive ? link.color === 'gradient' ? '#fff' : link.color : 'var(--text-secondary)' })}
                  onClick={closeMobile}
                >
                  <span 
                    className="nav-icon"
                    style={{ 
                      color: link.color === 'gradient' ? 'transparent' : link.color,
                      background: link.color === 'gradient' ? 'linear-gradient(135deg, #7c6aff, #ff6a9b)' : 'none',
                      WebkitBackgroundClip: link.color === 'gradient' ? 'text' : 'none',
                      fontSize: link.isText ? '1.2rem' : '1.1rem',
                      fontWeight: link.isText ? 800 : 'normal'
                    }}
                  >
                    {link.icon}
                  </span>
                  <span>{link.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="btn-logout" onClick={logout} title="Sair da Conta">
            <LogOut size={16} />
            <span>Desconectar</span>
          </button>
        </div>
      </aside>
    </>
  );
}
