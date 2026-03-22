import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrainCircuit, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const translateError = (code) => {
    switch (code) {
      case 'auth/email-already-in-use': return 'Este email já está cadastrado.';
      case 'auth/weak-password': return 'A senha deve ter pelo menos 6 caracteres.';
      case 'auth/invalid-email': return 'Email inválido.';
      default: return 'Erro ao criar conta. Tente novamente.';
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!nome || !email || !senha || !confirmarSenha) return;
    
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem.');
      return;
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await cadastrar(nome, email, senha);
      navigate('/');
    } catch (err) {
      setError(translateError(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-md" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="card" style={{ width: '100%', maxWidth: 420, padding: '40px' }}>
        
        <div className="text-center mb-xl">
          <BrainCircuit size={48} className="text-accent mb-sm inline-block" />
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Criar Conta</h1>
          <p className="text-muted">Comece a organizar sua vida digital</p>
        </div>

        {error && (
          <div className="mb-md p-sm text-center" style={{ background: 'rgba(231, 76, 60, 0.1)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(231,76,60,0.3)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex-col gap-md">
          <div className="form-group mb-0">
            <label>Nome Completo</label>
            <input 
              type="text" 
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Seu nome inteiro"
              required
            />
          </div>

          <div className="form-group mb-0">
            <label>Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="form-group mb-0">
            <label>Senha</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                required
                style={{ paddingRight: 40 }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group mb-0">
            <label>Confirmar Senha</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={confirmarSenha}
              onChange={e => setConfirmarSenha(e.target.value)}
              placeholder="Repita sua senha"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 mt-sm flex items-center justify-center" 
            style={{ height: 48, background: 'var(--accent)' }}
            disabled={isLoading || !nome || !email || !senha || !confirmarSenha}
          >
            {isLoading ? <Loader2 size={18} className="spin" /> : 'Criar Conta'}
          </button>
        </form>

        <p className="text-center text-muted mt-lg" style={{ fontSize: '0.9rem' }}>
          Já possui conta? <Link to="/login" className="text-accent font-bold">Acessar</Link>
        </p>
      </div>
    </div>
  );
}
