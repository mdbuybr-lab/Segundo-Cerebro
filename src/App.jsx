import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

import Login from './pages/auth/Login';
import Cadastro from './pages/auth/Cadastro';
import ResetSenha from './pages/auth/ResetSenha';

// Pages
import Dashboard from './pages/Dashboard';
import ContasBancarias from './pages/ContasBancarias';
import Entradas from './pages/Entradas';
import Saidas from './pages/Saidas';
import Programacoes from './pages/Programacoes';
import Dividas from './pages/Dividas';
import Academia from './pages/Academia';
import Metas from './pages/Metas';
import Tarefas from './pages/Tarefas';
import Projetos from './pages/Projetos';
import Agenda from './pages/Agenda';
import Anotacoes from './pages/Anotacoes';
import AssistenteIA from './pages/AssistenteIA';
import Configuracoes from './pages/Configuracoes';
import ImportarOFX from './pages/ImportarOFX';

function ProtectedLayout() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <Loader2 size={48} className="spin text-accent" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/contas" element={<ContasBancarias />} />
          <Route path="/entradas" element={<Entradas />} />
          <Route path="/saidas" element={<Saidas />} />
          <Route path="/programacoes" element={<Programacoes />} />
          <Route path="/dividas" element={<Dividas />} />
          <Route path="/academia" element={<Academia />} />
          <Route path="/metas" element={<Metas />} />
          <Route path="/tarefas" element={<Tarefas />} />
          <Route path="/projetos" element={<Projetos />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/anotacoes" element={<Anotacoes />} />
          <Route path="/assistente" element={<AssistenteIA />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/importar-ofx" element={<ImportarOFX />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/reset-senha" element={<ResetSenha />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default App;
