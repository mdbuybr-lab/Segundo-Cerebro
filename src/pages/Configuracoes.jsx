import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConfirmDialog } from '../components/shared';
import { Download, Upload, AlertTriangle, Key, HardDrive, Shield } from 'lucide-react';

export default function Configuracoes() {
  const { state, setConfig, importState, clearAll } = useApp();
  
  const [apiKeyInput, setApiKeyInput] = useState(state.config?.claudeApiKey || '');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const handleSaveApiKey = () => {
    setConfig('claudeApiKey', apiKeyInput);
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dt = new Date().toISOString().slice(0, 10);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `segundo-cerebro-backup-${dt}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e) => {
    const fileReader = new FileReader();
    if (e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target.result);
          if (importedData && typeof importedData === 'object') {
            const confirmImport = window.confirm("Importar dados irá SOBRESCREVER tudo que você tem atualmente e recarregar a página. Continuar?");
            if (confirmImport) {
              importState(importedData);
              window.location.reload();
            }
          }
        } catch (error) {
          alert("Erro ao ler o arquivo JSON. Tenha certeza de que é um backup válido.");
        }
      };
    }
    // reset input
    e.target.value = null;
  };

  const executeClearData = () => {
    clearAll();
    setIsConfirmClearOpen(false);
    window.location.href = '/';
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <h1>⚙️ Configurações</h1>
        <p>Gerencie seus dados e integrações</p>
      </div>

      <div className="flex-col gap-lg">
        {/* IA Config Section */}
        <section className="card p-lg">
          <div className="flex items-center gap-md mb-md">
            <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px' }}>
              <Key size={24} className="text-accent" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>API Key da Anthropic (Claude)</h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Obtenha em console.anthropic.com — Usado por todos os assistentes IA</p>
            </div>
          </div>
          
          <div className="flex items-end gap-sm mt-lg">
            <div className="form-group flex-1 mb-0">
              <label>Sua API Key</label>
              <input 
                type="password" 
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
              />
            </div>
            <button className="btn btn-primary" onClick={handleSaveApiKey} style={{ height: 42 }}>
              {apiKeySaved ? 'Salvo! ✓' : 'Salvar Chave'}
            </button>
          </div>
          <p className="text-muted mt-sm" style={{ fontSize: '0.8rem' }}>
            A chave é salva <strong className="text-text">apenas</strong> no seu navegador (localStorage) e não é enviada para nenhum outro lugar.
          </p>
        </section>

        {/* Data Management Section */}
        <section className="card p-lg">
          <div className="flex items-center gap-md mb-md">
            <div style={{ padding: '12px', background: 'var(--surface2)', borderRadius: '12px' }}>
              <HardDrive size={24} className="text-green" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Meus Dados</h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>O Segundo Cérebro funciona 100% offline no seu navegador. Faça backups frequentes!</p>
            </div>
          </div>

          <div className="grid mt-lg" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <h3 className="mb-sm flex items-center gap-xs"><Download size={18} /> Exportar Backup</h3>
              <p className="text-muted mb-md" style={{ fontSize: '0.85rem' }}>Baixe um arquivo JSON com todo o seu banco de dados atual.</p>
              <button className="btn btn-ghost w-100" style={{ width: '100%' }} onClick={handleExport}>
                Gerar Download
              </button>
            </div>

            <div className="card" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <h3 className="mb-sm flex items-center gap-xs"><Upload size={18} /> Importar Dados</h3>
              <p className="text-muted mb-md" style={{ fontSize: '0.85rem' }}>Restaure o sistema a partir de um JSON exportado anteriormente.</p>
              
              <label className="btn btn-ghost w-100 flex justify-center items-center cursor-pointer" style={{ width: '100%' }}>
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                Escolher Arquivo JSON
              </label>
            </div>
          </div>
        </section>

        {/* Danger Zone Section */}
        <section className="card p-lg" style={{ border: '1px solid rgba(231, 76, 60, 0.3)' }}>
          <div className="flex items-center gap-md mb-md">
            <div style={{ padding: '12px', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '12px' }}>
              <Shield size={24} className="text-red" />
            </div>
            <div>
              <h2 className="text-red" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>Zona de Perigo</h2>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Ações destrutivas relativas aos seus dados locais.</p>
            </div>
          </div>

          <div className="flex justify-between items-center mt-lg p-md" style={{ background: 'rgba(231, 76, 60, 0.05)', borderRadius: 'var(--radius)', border: '1px dashed var(--red)' }}>
            <div>
              <h3 className="text-red mb-xs">Apagar Todos os Dados</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>Esvazia permanentemente o banco de dados do seu navegador.</p>
            </div>
            <button className="btn" style={{ background: 'var(--red)', color: 'white' }} onClick={() => setIsConfirmClearOpen(true)}>
              <AlertTriangle size={18} /> Excluir Tudo
            </button>
          </div>
        </section>
      </div>

      <ConfirmDialog 
        isOpen={isConfirmClearOpen}
        title="Apagar Segundo Cérebro?"
        message="ALERTA: Isso irá APAGAR DESTRAUTIVAMENTE E IRREVERSIVELMENTE TODAS as contas, entradas, saídas, tarefas, anotações, metas e configurações do seu navegador. Você quer mesmo continuar?"
        onConfirm={executeClearData}
        onCancel={() => setIsConfirmClearOpen(false)}
      />
    </div>
  );
}
