import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrainCircuit, Loader2, MailCheck } from 'lucide-react';

export default function ResetSenha() {
  const { resetSenha } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const translateError = (code) => {
    switch (code) {
      case 'auth/user-not-found': return 'Não encontramos nenhum usuário com este email.';
      case 'auth/invalid-email': return 'Email inválido.';
      default: return 'Erro ao enviar email de recuperação. Verifique e tente novamente.';
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      await resetSenha(email);
      setSuccess(true);
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
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700 }}>Recuperar Senha</h1>
          <p className="text-muted">Enviaremos um link para redefinir sua senha.</p>
        </div>

        {error && (
          <div className="mb-md p-sm text-center" style={{ background: 'rgba(231, 76, 60, 0.1)', color: 'var(--red)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(231,76,60,0.3)', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {success ? (
          <div className="flex-col items-center justify-center text-center py-md" style={{ gap: '16px' }}>
            <div style={{ padding: '16px', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '50%' }}>
              <MailCheck size={48} className="text-green" />
            </div>
            <h2 style={{ fontSize: '1.2rem' }}>Email Enviado!</h2>
            <p className="text-muted mb-md" style={{ lineHeight: 1.5 }}>
              O link de redefinição de senha foi enviado para <strong className="text-text">{email}</strong>. Verifique sua caixa de entrada e pasta de spam.
            </p>
            <Link to="/login" className="btn btn-primary w-100 flex justify-center">
              Voltar ao Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleReset} className="flex-col gap-md">
            <div className="form-group mb-0">
              <label>Email da Conta</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100 mt-sm flex items-center justify-center" 
              style={{ height: 48, background: 'var(--accent)' }}
              disabled={isLoading || !email}
            >
              {isLoading ? <Loader2 size={18} className="spin" /> : 'Enviar Link de Recuperação'}
            </button>

            <p className="text-center text-muted mt-md" style={{ fontSize: '0.9rem' }}>
              <Link to="/login" className="text-muted font-bold underline" style={{ opacity: 0.8 }}>← Voltar ao login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
