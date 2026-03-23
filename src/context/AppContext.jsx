import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { collection, doc, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

const AppContext = createContext();

const defaultState = {
  config: { userName: '', apiKey: '', groqApiKey: '' },
  contas: [],
  entradas: [],
  saidas: [],
  programacoes: [],
  dividas: [],
  academia: { planos: [], treinos: [], metricas: [] },
  metas: [],
  tarefas: [],
  projetos: [],
  agenda: [],
  anotacoes: [],
  nutricao: { plano: null, refeicoes: [], hidratacao: [] },
};

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(defaultState);

  useEffect(() => {
    if (!user) {
      setState(defaultState);
      return;
    }

    const unsubscribes = [];

    // Profile config sync
    const profileRef = doc(db, `users/${user.uid}/profile`, 'config');
    unsubscribes.push(onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setState(s => ({ ...s, config: { ...s.config, ...docSnap.data() } }));
      }
    }));

    // Arrays genéricos
    const collections = [
      'contas', 'entradas', 'saidas', 'programacoes', 'dividas',
      'metas', 'tarefas', 'projetos', 'agenda', 'anotacoes'
    ];
    
    collections.forEach(col => {
      const q = query(collection(db, `users/${user.uid}/${col}`), orderBy('criadoEm', 'desc'));
      unsubscribes.push(onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setState(s => ({ ...s, [col]: data }));
      }));
    });

    // Academia Planos e Treinos
    const qPlanos = query(collection(db, `users/${user.uid}/academia_planos`), orderBy('criadoEm', 'desc'));
    unsubscribes.push(onSnapshot(qPlanos, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setState(s => ({ ...s, academia: { ...s.academia, planos: data } }));
    }));

    const qTreinos = query(collection(db, `users/${user.uid}/academia_treinos`), orderBy('criadoEm', 'desc'));
    unsubscribes.push(onSnapshot(qTreinos, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setState(s => ({ ...s, academia: { ...s.academia, treinos: data } }));
    }));

    // Academia Métricas
    const qMetricas = query(collection(db, `users/${user.uid}/academia_metricas`), orderBy('criadoEm', 'desc'));
    unsubscribes.push(onSnapshot(qMetricas, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setState(s => ({ ...s, academia: { ...s.academia, metricas: data } }));
    }));

    // Nutrição Refeições
    const qRefeicoes = query(collection(db, `users/${user.uid}/nutricao_refeicoes`), orderBy('criadoEm', 'desc'));
    unsubscribes.push(onSnapshot(qRefeicoes, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setState(s => ({ ...s, nutricao: { ...s.nutricao, refeicoes: data } }));
    }));

    // Nutrição Hidratação
    const qHidratacao = query(collection(db, `users/${user.uid}/nutricao_hidratacao`), orderBy('criadoEm', 'desc'));
    unsubscribes.push(onSnapshot(qHidratacao, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setState(s => ({ ...s, nutricao: { ...s.nutricao, hidratacao: data } }));
    }));

    // Nutrição Plano (documento único)
    const planoRef = doc(db, `users/${user.uid}/nutricao_plano`, 'atual');
    unsubscribes.push(onSnapshot(planoRef, (docSnap) => {
      if (docSnap.exists()) {
        setState(s => ({ ...s, nutricao: { ...s.nutricao, plano: { id: docSnap.id, ...docSnap.data() } } }));
      }
    }));

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [user]);

  const getFirestoreCol = (collectionName) => {
    if (collectionName === 'planos') return 'academia_planos';
    if (collectionName === 'treinos') return 'academia_treinos';
    if (collectionName === 'metricas') return 'academia_metricas';
    if (collectionName === 'refeicoes') return 'nutricao_refeicoes';
    if (collectionName === 'hidratacao') return 'nutricao_hidratacao';
    return collectionName;
  };

  const addItem = useCallback(async (collectionName, item) => {
    if (!user) return;
    try {
      const firestoreCol = getFirestoreCol(collectionName);
      await addDoc(collection(db, `users/${user.uid}/${firestoreCol}`), {
        ...item,
        criadoEm: serverTimestamp()
      });
    } catch (e) {
      console.error('Erro ao adicionar:', e);
      alert('❌ Erro ao salvar no Firebase. Verifique sua conexão e tente novamente.');
    }
  }, [user]);

  const updateItem = useCallback(async (collectionName, id, updates) => {
    if (!user) return;
    try {
      const firestoreCol = getFirestoreCol(collectionName);
      await updateDoc(doc(db, `users/${user.uid}/${firestoreCol}`, id), updates);
    } catch (e) {
      console.error('Erro ao atualizar:', e);
      alert('❌ Erro ao atualizar no Firebase. Verifique sua conexão e tente novamente.');
    }
  }, [user]);

  const deleteItem = useCallback(async (collectionName, id) => {
    if (!user) return;
    try {
      const firestoreCol = getFirestoreCol(collectionName);
      await deleteDoc(doc(db, `users/${user.uid}/${firestoreCol}`, id));
    } catch (e) {
      console.error('Erro ao deletar:', e);
      alert('❌ Erro ao deletar no Firebase. Verifique sua conexão e tente novamente.');
    }
  }, [user]);

  const setConfig = useCallback(async (key, value) => {
    if (!user) return;
    try {
      /* Especial case for config updates passing object vs single key string 
         App historically used dispatch({ type: 'SET_CONFIG', payload: updates });
         Wait, checking AppContext old version: setConfig((updates)) */
      const docRef = doc(db, `users/${user.uid}/profile`, 'config');
      if (typeof key === 'object') {
        const updates = key;
        await setDoc(docRef, updates, { merge: true });
        // Local optimist update
        setState(s => ({ ...s, config: { ...s.config, ...updates } }));
      } else {
        await setDoc(docRef, { [key]: value }, { merge: true });
        setState(s => ({ ...s, config: { ...s.config, [key]: value } }));
      }
    } catch (e) {
      console.error('Erro ao salvar config:', e);
      alert('❌ Erro ao salvar configurações no Firebase.');
    }
  }, [user]);

  const importState = useCallback(() => {
    alert('⚠️ A importação massiva JSON não é suportada na nuvem do Firebase por enquanto.');
  }, []);

  const clearAll = useCallback(() => {
    alert('⚠️ A limpeza de banco de dados massiva desativada na nuvem. Gerencie os itens individualmente.');
  }, []);

  return (
    <AppContext.Provider
      value={{ state, dispatch: () => {}, addItem, updateItem, deleteItem, setConfig, importState, clearAll }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
