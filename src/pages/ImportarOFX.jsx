import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { db } from '../firebase';
import { collection, getDocs, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { Upload, FileText, ChevronDown, ChevronUp, CheckSquare, Square, AlertTriangle, Loader2, Check, ArrowRight, Trash2, Info } from 'lucide-react';

// =========== OFX PARSER ===========
function parseOFX(content) {
  const transactions = [];
  const transactionBlocks = content.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g) || [];

  transactionBlocks.forEach(block => {
    const getValue = (tag) => {
      const match = block.match(new RegExp(`<${tag}>([^<\\n\\r]+)`));
      return match ? match[1].trim() : '';
    };

    const trntype = getValue('TRNTYPE');
    const dtposted = getValue('DTPOSTED');
    const trnamt = parseFloat(getValue('TRNAMT').replace(',', '.'));
    const memo = getValue('MEMO') || getValue('NAME') || 'Transação importada';
    const fitid = getValue('FITID');

    if (!dtposted || isNaN(trnamt)) return;

    const year = dtposted.substring(0, 4);
    const month = dtposted.substring(4, 6);
    const day = dtposted.substring(6, 8);
    const date = `${year}-${month}-${day}`;
    const type = trnamt > 0 ? 'entrada' : 'saida';

    transactions.push({
      id: fitid || `${date}-${trnamt}-${memo}`,
      date,
      description: memo,
      amount: Math.abs(trnamt),
      type,
      category: detectCategory(memo, type),
      selected: true,
      duplicate: false
    });
  });

  return transactions.sort((a, b) => b.date.localeCompare(a.date));
}

// =========== CATEGORY DETECTION ===========
function detectCategory(description, type) {
  const desc = description.toLowerCase();

  if (type === 'entrada') {
    if (desc.includes('salario') || desc.includes('salário') || desc.includes('folha')) return 'Salário';
    if (desc.includes('pix receb') || desc.includes('transf receb')) return 'Transferência Recebida';
    if (desc.includes('rendimento') || desc.includes('juros')) return 'Investimento';
    return 'Outros';
  }

  if (desc.includes('mercado') || desc.includes('supermercado') || desc.includes('ifood') || desc.includes('restaurante') || desc.includes('padaria')) return 'Alimentação';
  if (desc.includes('uber') || desc.includes('99') || desc.includes('combustivel') || desc.includes('posto') || desc.includes('estacionamento')) return 'Transporte';
  if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('amazon') || desc.includes('apple') || desc.includes('disney')) return 'Assinaturas';
  if (desc.includes('farmacia') || desc.includes('drogaria') || desc.includes('hospital') || desc.includes('medico')) return 'Saúde';
  if (desc.includes('aluguel') || desc.includes('condominio') || desc.includes('luz') || desc.includes('agua') || desc.includes('internet') || desc.includes('energia')) return 'Moradia';
  if (desc.includes('escola') || desc.includes('faculdade') || desc.includes('curso') || desc.includes('udemy')) return 'Educação';
  return 'Outros';
}

const categoriaEntrada = ['Salário', 'Freelance', 'Investimento', 'Transferência Recebida', 'Outros'];
const categoriaSaida = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Assinaturas', 'Compras', 'Outros'];

const bankInstructions = [
  { name: 'Nubank', text: 'App Nubank → Meu Perfil → Exportar extrato → OFX' },
  { name: 'Itaú', text: 'Internet Banking → Extrato → Exportar → Formato OFX' },
  { name: 'Bradesco', text: 'Internet Banking → Extrato → Salvar como OFX' },
  { name: 'Banco do Brasil', text: 'Internet Banking → Extrato → Baixar OFX' },
  { name: 'Caixa Econômica', text: 'Internet Banking → Extrato → Exportar OFX' },
  { name: 'Outros bancos', text: 'Acesse o Internet Banking → Extrato → procure opção de exportar/baixar em formato OFX ou .ofx' },
];

export default function ImportarOFX() {
  const { user } = useAuth();
  const { state } = useApp();

  const [transactions, setTransactions] = useState([]);
  const [fileName, setFileName] = useState('');
  const [contaDestino, setContaDestino] = useState('');
  const [ignorarDuplicatas, setIgnorarDuplicatas] = useState(true);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [openBank, setOpenBank] = useState(null);
  const [importHistory, setImportHistory] = useState([]);

  const fileInputRef = useRef(null);
  const contas = state.contasBancarias || [];

  // Load import history
  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const snap = await getDocs(collection(db, `users/${user.uid}/importacoes`));
      const hist = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      hist.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
      setImportHistory(hist);
    } catch { /* ignore */ }
  }, [user]);

  useState(() => { loadHistory(); }, [loadHistory]);

  // Check duplicates
  const checkDuplicates = async (txns) => {
    if (!user) return txns;
    try {
      const [entradasSnap, saidasSnap] = await Promise.all([
        getDocs(collection(db, `users/${user.uid}/entradas`)),
        getDocs(collection(db, `users/${user.uid}/saidas`)),
      ]);
      const existingIds = new Set();
      entradasSnap.docs.forEach(d => { if (d.data().ofxId) existingIds.add(d.data().ofxId); });
      saidasSnap.docs.forEach(d => { if (d.data().ofxId) existingIds.add(d.data().ofxId); });

      return txns.map(t => ({
        ...t,
        duplicate: existingIds.has(t.id),
        selected: !existingIds.has(t.id)
      }));
    } catch {
      return txns;
    }
  };

  // Handle file
  const processFile = async (file) => {
    setError('');
    setSuccess(null);
    setTransactions([]);

    if (!file || !file.name.toLowerCase().endsWith('.ofx')) {
      setError('❌ Arquivo inválido. Certifique-se de exportar no formato .OFX');
      return;
    }

    if (contas.length === 0) {
      setError('⚠️ Cadastre pelo menos uma conta bancária antes de importar.');
      return;
    }

    setLoading(true);
    setFileName(file.name);

    try {
      const text = await file.text();
      let parsed = parseOFX(text);

      if (parsed.length === 0) {
        setError('⚠️ Nenhuma transação encontrada no arquivo.');
        setLoading(false);
        return;
      }

      parsed = await checkDuplicates(parsed);
      setTransactions(parsed);
      if (!contaDestino && contas.length > 0) setContaDestino(contas[0].nome || contas[0].id);
    } catch (e) {
      setError('❌ Erro ao ler o arquivo. Verifique se é um OFX válido.');
    }
    setLoading(false);
  };

  const onFileChange = (e) => { if (e.target.files[0]) processFile(e.target.files[0]); };
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); };

  // Toggle operations
  const toggleAll = (val) => setTransactions(prev => prev.map(t => ({ ...t, selected: t.duplicate && ignorarDuplicatas ? false : val })));
  const toggleOne = (id) => setTransactions(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
  const updateCategory = (id, cat) => setTransactions(prev => prev.map(t => t.id === id ? { ...t, category: cat } : t));

  const selected = transactions.filter(t => t.selected && !(t.duplicate && ignorarDuplicatas));
  const totalEntradas = selected.filter(t => t.type === 'entrada').reduce((a, t) => a + t.amount, 0);
  const totalSaidas = selected.filter(t => t.type === 'saida').reduce((a, t) => a + t.amount, 0);

  // Import
  const handleImport = async () => {
    if (selected.length === 0 || !user) return;
    setImporting(true);
    setError('');
    try {
      const batch = writeBatch(db);

      for (const t of selected) {
        const col = t.type === 'entrada' ? 'entradas' : 'saidas';
        const ref = doc(collection(db, `users/${user.uid}/${col}`));
        batch.set(ref, {
          desc: t.description,
          valor: t.amount,
          data: t.date,
          cat: t.category,
          conta: contaDestino,
          ofxId: t.id,
          importado: true,
          criadoEm: serverTimestamp()
        });
      }

      await batch.commit();

      // Save import history
      const periodoMin = selected.reduce((min, t) => t.date < min ? t.date : min, selected[0].date);
      const periodoMax = selected.reduce((max, t) => t.date > max ? t.date : max, selected[0].date);
      await addDoc(collection(db, `users/${user.uid}/importacoes`), {
        arquivo: fileName,
        transacoes: selected.length,
        periodoInicio: periodoMin,
        periodoFim: periodoMax,
        data: new Date().toISOString().split('T')[0],
        criadoEm: serverTimestamp()
      });

      const ignored = transactions.filter(t => t.duplicate).length;
      setSuccess({
        total: selected.length,
        ignored,
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo: totalEntradas - totalSaidas
      });
      setTransactions([]);
      loadHistory();
    } catch (e) {
      setError('❌ Erro ao salvar. Tente novamente.');
    }
    setImporting(false);
  };

  const formatCurrency = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDateBR = (d) => d ? d.split('-').reverse().join('/') : '';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        .ofx-page { animation: fadeInUp 0.4s ease forwards; }
        @keyframes fadeInUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }

        .drop-zone {
          border: 2px dashed var(--accent);
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: transparent;
        }
        .drop-zone:hover, .drop-zone.active {
          border-style: solid;
          background: rgba(124,106,255,0.05);
          box-shadow: 0 0 30px rgba(124,106,255,0.15);
        }
        .drop-zone .upload-icon {
          animation: bounce 2s infinite ease-in-out;
        }
        @keyframes bounce {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .bank-accordion {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
        }
        .bank-item {
          border-bottom: 1px solid var(--border);
          cursor: pointer;
        }
        .bank-item:last-child { border-bottom: none; }
        .bank-item-header {
          padding: 14px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-weight: 600;
          font-size: 0.9rem;
          transition: background 0.2s;
        }
        .bank-item-header:hover { background: var(--surface2); }
        .bank-item-body {
          padding: 0 20px 14px;
          color: var(--text-secondary);
          font-size: 0.85rem;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .preview-table th {
          text-align: left;
          padding: 10px 12px;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border);
          font-family: var(--font-mono);
          white-space: nowrap;
        }
        .preview-table td {
          padding: 10px 12px;
          border-bottom: 1px solid rgba(37,37,56,0.5);
          vertical-align: middle;
        }
        .preview-table tr:nth-child(even) td { background: rgba(255,255,255,0.01); }
        .preview-table tr:hover td { background: var(--surface2); }
        .preview-table tr.duplicate td { background: rgba(255,211,42,0.05); }

        .config-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          padding: 20px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
        }

        .success-card {
          background: linear-gradient(135deg, rgba(0,230,118,0.08) 0%, rgba(0,230,118,0.02) 100%);
          border: 1px solid rgba(0,230,118,0.2);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
        }
        .success-card h2 { color: var(--green); margin-bottom: 20px; }

        .history-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.85rem;
        }
        .history-table th {
          text-align: left; padding: 10px 12px;
          font-size: 0.7rem; text-transform: uppercase; letter-spacing: 1px;
          color: var(--text-secondary); border-bottom: 1px solid var(--border);
          font-family: var(--font-mono);
        }
        .history-table td { padding: 10px 12px; border-bottom: 1px solid rgba(37,37,56,0.5); }

        @media (max-width: 768px) {
          .drop-zone { padding: 32px 16px; }
          .config-section { grid-template-columns: 1fr; }
          .preview-table, .history-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
        }
      `}</style>

      <div className="ofx-page">
        {/* Header */}
        <div className="page-header mb-lg">
          <h1>📥 Importar Extrato Bancário</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Importe seu extrato OFX e popule suas finanças automaticamente</p>
        </div>

        {/* Success State */}
        {success && (
          <div className="success-card mb-xl">
            <Check size={48} style={{ color: 'var(--green)', marginBottom: 12 }} />
            <h2>✅ Importação concluída!</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'center', marginTop: 16, fontSize: '0.95rem' }}>
              <div><strong>{success.total}</strong> transações importadas</div>
              <div><strong>{success.ignored}</strong> ignoradas (duplicatas)</div>
              <div style={{ color: 'var(--green)' }}>Entradas: <strong>{formatCurrency(success.entradas)}</strong></div>
              <div style={{ color: 'var(--red)' }}>Saídas: <strong>{formatCurrency(success.saidas)}</strong></div>
              <div>Saldo: <strong style={{ color: success.saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(success.saldo)}</strong></div>
            </div>
            <div className="flex gap-md justify-center mt-lg">
              <Link to="/entradas" className="btn btn-primary" style={{ borderRadius: 10 }}>Ver Entradas <ArrowRight size={16} /></Link>
              <Link to="/saidas" className="btn btn-ghost" style={{ borderRadius: 10 }}>Ver Saídas <ArrowRight size={16} /></Link>
              <button className="btn btn-ghost" style={{ borderRadius: 10 }} onClick={() => setSuccess(null)}>Nova importação</button>
            </div>
          </div>
        )}

        {!success && (
          <>
            {/* Section 1: Help Accordion */}
            <div className="mb-lg">
              <button
                className="btn btn-ghost w-100 flex items-center justify-between"
                style={{ background: 'var(--surface)', borderRadius: 12, padding: '14px 20px' }}
                onClick={() => setHelpOpen(!helpOpen)}
              >
                <span className="flex items-center gap-sm"><Info size={18} className="text-accent" /> Como baixar seu extrato OFX</span>
                {helpOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {helpOpen && (
                <div className="bank-accordion mt-sm">
                  {bankInstructions.map((bank, i) => (
                    <div className="bank-item" key={i}>
                      <div className="bank-item-header" onClick={() => setOpenBank(openBank === i ? null : i)}>
                        {bank.name}
                        {openBank === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                      {openBank === i && <div className="bank-item-body">{bank.text}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="mb-lg" style={{ background: 'rgba(255,71,87,0.08)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 12, padding: '16px 20px', color: 'var(--red)' }}>
                {error}
              </div>
            )}

            {/* Section 2: Upload */}
            {transactions.length === 0 && !loading && (
              <div
                className={`drop-zone mb-lg ${dragOver ? 'active' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                <Upload size={48} className="text-accent upload-icon" style={{ marginBottom: 16 }} />
                <h3 style={{ marginBottom: 8 }}>Arraste seu arquivo .OFX aqui</h3>
                <p className="text-muted">ou clique para selecionar</p>
                <p className="text-muted mt-sm" style={{ fontSize: '0.8rem' }}>Formatos aceitos: .ofx, .OFX</p>
                <input ref={fileInputRef} type="file" accept=".ofx,.OFX" onChange={onFileChange} style={{ display: 'none' }} />
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-md py-xl">
                <Loader2 size={28} className="spin text-accent" />
                <span>Processando extrato...</span>
              </div>
            )}

            {/* Section 3: Config + Section 4: Preview */}
            {transactions.length > 0 && (
              <>
                {/* File name banner */}
                <div className="flex items-center gap-md mb-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 20px' }}>
                  <FileText size={20} className="text-accent" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{fileName}</div>
                    <div className="text-muted" style={{ fontSize: '0.8rem' }}>{transactions.length} transações encontradas</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setTransactions([]); setFileName(''); }}>Trocar arquivo</button>
                </div>

                {/* Config */}
                <div className="config-section mb-lg">
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Conta de destino</label>
                    <select value={contaDestino} onChange={e => setContaDestino(e.target.value)}>
                      {contas.map(c => <option key={c.id} value={c.nome || c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Duplicatas</label>
                    <div className="flex gap-md mt-xs">
                      <label className="flex items-center gap-xs" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="radio" checked={ignorarDuplicatas} onChange={() => setIgnorarDuplicatas(true)} /> Ignorar duplicatas
                      </label>
                      <label className="flex items-center gap-xs" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input type="radio" checked={!ignorarDuplicatas} onChange={() => setIgnorarDuplicatas(false)} /> Importar mesmo assim
                      </label>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Período do extrato</label>
                    <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 6 }}>
                      {formatDateBR(transactions[transactions.length - 1]?.date)} → {formatDateBR(transactions[0]?.date)}
                    </div>
                  </div>
                </div>

                {/* Preview Controls */}
                <div className="flex justify-between items-center mb-md">
                  <div className="flex gap-sm">
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleAll(true)}>Selecionar todas</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleAll(false)}>Desmarcar todas</button>
                  </div>
                  <span className="text-muted font-mono" style={{ fontSize: '0.85rem' }}>
                    {selected.length} de {transactions.length} selecionadas
                  </span>
                </div>

                {/* Preview Table */}
                <div style={{ overflowX: 'auto', marginBottom: 24 }}>
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Valor</th>
                        <th>Tipo</th>
                        <th>Categoria</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map(t => (
                        <tr key={t.id} className={t.duplicate ? 'duplicate' : ''}>
                          <td>
                            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)' }} onClick={() => toggleOne(t.id)}>
                              {t.selected ? <CheckSquare size={18} className="text-accent" /> : <Square size={18} className="text-muted" />}
                            </button>
                          </td>
                          <td className="font-mono" style={{ whiteSpace: 'nowrap' }}>{formatDateBR(t.date)}</td>
                          <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</td>
                          <td className="font-mono" style={{ fontWeight: 700, color: t.type === 'entrada' ? 'var(--green)' : 'var(--red)', whiteSpace: 'nowrap' }}>
                            {t.type === 'saida' ? '-' : '+'}{formatCurrency(t.amount)}
                          </td>
                          <td>
                            <span className={`badge ${t.type === 'entrada' ? 'badge-green' : 'badge-red'}`}>
                              {t.type === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td>
                            <select
                              value={t.category}
                              onChange={e => updateCategory(t.id, e.target.value)}
                              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: '0.8rem' }}
                            >
                              {(t.type === 'entrada' ? categoriaEntrada : categoriaSaida).map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            {t.duplicate && (
                              <span className="badge badge-yellow flex items-center gap-xs" style={{ whiteSpace: 'nowrap' }}>
                                <AlertTriangle size={12} /> Duplicata
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary + Import button */}
                <div className="flex justify-between items-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', flexWrap: 'wrap', gap: 12 }}>
                  <div className="flex gap-lg font-mono" style={{ fontSize: '0.85rem', flexWrap: 'wrap', gap: '16px' }}>
                    <span className="text-green">Entradas: {formatCurrency(totalEntradas)}</span>
                    <span className="text-red">Saídas: {formatCurrency(totalSaidas)}</span>
                    <span>Saldo: <strong style={{ color: totalEntradas - totalSaidas >= 0 ? 'var(--green)' : 'var(--red)' }}>{formatCurrency(totalEntradas - totalSaidas)}</strong></span>
                  </div>
                  <button
                    className="btn btn-primary flex items-center gap-sm"
                    style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent2))', borderRadius: 10, height: 44, padding: '0 24px' }}
                    onClick={handleImport}
                    disabled={importing || selected.length === 0}
                  >
                    {importing ? <Loader2 size={18} className="spin" /> : <>💾 Importar {selected.length} transações</>}
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* Import History */}
        {importHistory.length > 0 && (
          <div className="mt-xl">
            <h2 className="mb-md flex items-center gap-sm" style={{ fontSize: '1.1rem' }}>📋 Histórico de Importações</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Arquivo</th>
                    <th>Transações</th>
                    <th>Período</th>
                  </tr>
                </thead>
                <tbody>
                  {importHistory.map(h => (
                    <tr key={h.id}>
                      <td className="font-mono">{formatDateBR(h.data)}</td>
                      <td><FileText size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{h.arquivo}</td>
                      <td className="font-mono">{h.transacoes} itens</td>
                      <td className="font-mono text-muted">{formatDateBR(h.periodoInicio)} → {formatDateBR(h.periodoFim)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
