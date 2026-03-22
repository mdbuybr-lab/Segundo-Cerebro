import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged, signOut,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, sendPasswordResetEmail, updateProfile
} from "firebase/auth";
import { auth, googleProvider, appleProvider } from "../firebase";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const loginEmail = (email, senha) =>
    signInWithEmailAndPassword(auth, email, senha);

  const loginGoogle = () =>
    signInWithPopup(auth, googleProvider);

  const loginApple = () =>
    signInWithPopup(auth, appleProvider);

  const cadastrar = async (nome, email, senha) => {
    const result = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(result.user, { displayName: nome });
    return result;
  };

  const resetSenha = (email) =>
    sendPasswordResetEmail(auth, email);

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{
      user, loading,
      loginEmail, loginGoogle, loginApple,
      cadastrar, resetSenha, logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
