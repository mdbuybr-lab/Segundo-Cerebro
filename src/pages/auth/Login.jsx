import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrainCircuit, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

export default function Login() {
  const { loginEmail, loginGoogle, loginApple } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const translateError = (code) => {
    switch (code) {
      case 'auth/user-not-found': return 'Usuário não encontrado.';
      case 'auth/wrong-password': return 'Senha incorreta.';
      case 'auth/invalid-email': return 'Email inválido.';
      case 'auth/invalid-credential': return 'Email ou senha incorretos.';
      case 'auth/too-many-requests': return 'Muitas tentativas. Tente mais tarde.';
      case 'auth/popup-closed-by-user': return 'Login cancelado.';
      default: return 'Erro ao fazer login. Verifique suas credenciais.';
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email || !senha) return;
    setIsLoading(true);
    setError('');

    try {
      await loginEmail(email, senha);
      navigate('/');
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      if (provider === 'google') await loginGoogle();
      if (provider === 'apple') await loginApple();
      navigate('/');
    } catch (err) {
      setError(translateError(err.code));
    }
  };

  return (
    <>
      <style>{`
        .login-page {
          display: flex;
          min-height: 100vh;
          background: #0a0a0f;
          color: var(--text);
          overflow: hidden;
        }

        /* Lado Esquerdo - Painel Visual */
        .login-left {
          flex: 6;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px;
          background: linear-gradient(-45deg, #0a0a0f, #231b4d, #421b36, #0a0a0f);
          background-size: 400% 400%;
          animation: gradientMesh 12s ease infinite;
          overflow: hidden;
        }

        .login-left::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opactiy='0.05'/%3E%3C/svg%3E");
          opacity: 0.04;
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        /* Floating Circles */
        .circle-1, .circle-2, .circle-3 {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          z-index: 0;
          opacity: 0.5;
        }
        .circle-1 {
          width: 400px; height: 400px;
          background: #7c6aff;
          top: -100px; left: -100px;
          animation: float 10s ease-in-out infinite alternate;
        }
        .circle-2 {
          width: 300px; height: 300px;
          background: #ff6a9b;
          bottom: 10%; right: -50px;
          animation: float 8s ease-in-out infinite alternate-reverse;
        }
        .circle-3 {
          width: 200px; height: 200px;
          background: #2ecc71;
          top: 40%; left: 30%;
          animation: float 12s ease-in-out infinite alternate;
          opacity: 0.2;
        }

        .login-left-content {
          position: relative;
          z-index: 10;
          max-width: 500px;
          margin: 0 auto;
          animation: fadeInSlideRight 0.8s ease-out forwards;
        }

        .login-left h1 {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 3rem;
          margin-bottom: 16px;
          line-height: 1.1;
          background: linear-gradient(135deg, #fff, #b8b8d0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-left .subtitle {
          font-size: 1.1rem;
          color: rgba(255,255,255,0.7);
          margin-bottom: 40px;
          line-height: 1.5;
        }

        .features-list {
          list-style: none;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .features-list li {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 1.05rem;
          font-weight: 500;
          color: #e8e8f0;
          background: rgba(255,255,255,0.05);
          padding: 12px 20px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
        }

        .brand-footer {
          position: absolute;
          bottom: 40px;
          left: 60px;
          z-index: 10;
          font-size: 0.85rem;
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        /* Lado Direito - Formulário */
        .login-right {
          flex: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0f;
          position: relative;
        }

        .login-right::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opactiy='0.05'/%3E%3C/svg%3E");
          opacity: 0.03;
          pointer-events: none;
        }

        .login-form-container {
          width: 100%;
          max-width: 440px;
          padding: 48px;
          animation: fadeInUp 0.6s ease-out forwards;
          position: relative;
          z-index: 10;
        }

        .login-form-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .login-form-header h2 {
          font-family: var(--font-heading);
          font-size: 1.8rem;
          font-weight: 700;
          margin-top: 16px;
          margin-bottom: 4px;
        }

        .login-form-header p {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }

        /* Social Buttons */
        .social-btn {
          width: 100%;
          height: 48px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }

        .social-btn svg {
          position: absolute;
          left: 16px;
        }

        .social-btn.google {
          background: #ffffff;
          color: #111111;
          border: none;
        }

        .social-btn.apple {
          background: #1a1a1a;
          color: #ffffff;
          border: 1px solid #333333;
        }

        .social-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }

        .divider {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 24px 0;
          color: #555566;
          font-size: 0.8rem;
        }

        .divider::before, .divider::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #2a2a3a;
        }

        .divider:not(:empty)::before { margin-right: 16px; }
        .divider:not(:empty)::after { margin-left: 16px; }

        /* Custom Inputs */
        .input-group label {
          display: block;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #8888aa;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .input-wrapper {
          position: relative;
        }

        .custom-input {
          width: 100%;
          background: #111118;
          border: 1px solid #2a2a3a;
          border-radius: 10px;
          padding: 14px 16px;
          color: #fff;
          font-size: 1rem;
          transition: all 0.2s ease;
          outline: none;
        }

        .custom-input:focus {
          border-color: #7c6aff;
          box-shadow: 0 0 0 3px rgba(124,106,255,0.15);
        }

        .btn-submit {
          width: 100%;
          height: 48px;
          border-radius: 10px;
          background: linear-gradient(135deg, #7c6aff, #ff6a9b);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-body);
        }

        .btn-submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(124,106,255,0.3);
          filter: brightness(1.1);
        }

        .btn-submit:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Animações */
        @keyframes gradientMesh {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes float {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(30px, -50px) scale(1.1); }
        }

        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeInSlideRight {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }

        /* Responsividade */
        @media (max-width: 900px) {
          .login-left { display: none; }
          .login-right { flex: 1; background: linear-gradient(180deg, #120e2b 0%, #0a0a0f 30%); }
          .login-form-container { padding: 32px 24px; }
        }
      `}</style>

      <div className="login-page">
        {/* Lado Esquerdo */}
        <div className="login-left">
          <div className="circle-1"></div>
          <div className="circle-2"></div>
          <div className="circle-3"></div>
          
          <div className="login-left-content">
            <div style={{ background: 'rgba(124,106,255,0.2)', width: 80, height: 80, borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 0 40px rgba(124,106,255,0.4)', border: '1px solid rgba(124,106,255,0.3)' }}>
              <span style={{ fontSize: '3rem' }}>🧠</span>
            </div>
            
            <h1>Segundo Cérebro</h1>
            <p className="subtitle">
              Sua central de produtividade, finanças e vida organizada em um só lugar.
            </p>
            
            <ul className="features-list">
              <li>
                <span style={{ fontSize: '1.2rem' }}>💰</span> Controle financeiro completo
              </li>
              <li>
                <CheckCircle2 color="#2ecc71" size={20} /> Tarefas, projetos e metas
              </li>
              <li>
                <span style={{ fontSize: '1.2rem' }}>🤖</span> Assistente IA integrado
              </li>
            </ul>
          </div>

          <div className="brand-footer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Seus dados protegidos com Firebase
          </div>
        </div>

        {/* Lado Direito */}
        <div className="login-right">
          <div className="login-form-container">
            <div className="login-form-header">
              <BrainCircuit size={40} color="var(--accent)" className="inline-block" style={{ filter: 'drop-shadow(0 0 10px rgba(124,106,255,0.4))' }} />
              <h2>Bem-vindo de volta</h2>
              <p>Entre na sua conta para continuar</p>
            </div>

            {error && (
              <div style={{ background: 'rgba(231,76,60,0.1)', color: 'var(--red)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(231,76,60,0.2)', fontSize: '0.9rem', marginBottom: '24px', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '8px' }}>
              <button type="button" className="social-btn google" onClick={() => handleSocialLogin('google')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar com Google
              </button>

              <button type="button" className="social-btn apple" onClick={() => handleSocialLogin('apple')}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 384 512">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.3 48.6-.7 90.5-84.8 103.1-120.7-37.5-15.6-62.4-53.6-62.2-89.9zM203 125.4c17.8-21.7 33-51.5 29.8-82.6-27 1.8-57.8 19-76 40.4-16.1 18.8-33.3 49.3-29.3 79.7 30 2.2 57.7-15.8 75.5-37.5z"/>
                </svg>
                Continuar com Apple
              </button>
            </div>

            <div className="divider">ou entre com email</div>

            <form onSubmit={handleEmailLogin}>
              <div className="input-group" style={{ marginBottom: '20px' }}>
                <label>Email da Conta</label>
                <input 
                  type="email" 
                  className="custom-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Seu email"
                  required
                />
              </div>

              <div className="input-group" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ marginBottom: 0 }}>Senha</label>
                  <Link to="/reset-senha" style={{ color: 'var(--accent)', fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600 }}>
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="input-wrapper" style={{ marginTop: '8px' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="custom-input"
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="Sua senha secreta"
                    required
                    style={{ paddingRight: '48px' }}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#8888aa', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-submit"
                disabled={isLoading || !email || !senha}
              >
                {isLoading ? <Loader2 size={20} className="spin" /> : 'Entrar na Central'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '0.95rem', color: '#8888aa' }}>
              Não tem conta? <Link to="/cadastro" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Criar conta</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
