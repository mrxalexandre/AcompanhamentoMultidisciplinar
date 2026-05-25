import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Login() {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Firebase Auth requires email format. 
            // If the user types a simple login (like 'admin'), append a domain.
            const email = login.includes('@') ? login : `${login}@sistema.local`;
            
            // O Firebase exige senhas com no mínimo 6 caracteres. 
            // Para mantermos o fluxo de "admin"/"admin" e login=senha, repetimos a senha até atingir 6 chars (padding transparente).
            let finalPassword = password;
            if (finalPassword.length > 0 && finalPassword.length < 6) {
                finalPassword = finalPassword.padEnd(6, password); 
            }
            
            try {
                await signInWithEmailAndPassword(auth, email, finalPassword);
                navigate('/');
            } catch (signInErr: any) {
                // Se for o primeiro setup do admin, vamos tentar criar a conta com a senha solicitada
                if (email === 'admin@sistema.local' && password === 'x123456') {
                    try {
                        const cred = await createUserWithEmailAndPassword(auth, email, finalPassword);
                        await setDoc(doc(db, 'users', cred.user.uid), {
                            id: cred.user.uid,
                            name: 'Administrador Principal',
                            email: email,
                            role: 'admin',
                            createdAt: Date.now(),
                            updatedAt: Date.now()
                        });
                        navigate('/');
                        return;
                    } catch (createErr: any) {
                        console.error('Falha ao criar admin', createErr);
                        if (createErr.code === 'auth/operation-not-allowed') {
                            setError('Firebase: A autenticação por Email/Senha não está ativada. Acesse o Firebase Console > Authentication > Settings e ative Email/Password.');
                            return;
                        }
                    }
                }
                setError('Credenciais inválidas. Tente novamente.');
            }
        } catch (err: any) {
             setError(err.message || 'Ocorreu um erro ao fazer login.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#581c87] text-white p-4 relative overflow-hidden">
             <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[100px] opacity-40"></div>
             <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/20 blur-[100px] opacity-40"></div>
             
             <div className="w-full max-w-md relative z-10">
                 <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-white/20">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-400 to-indigo-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-blue-500/30 mb-4">Σ</div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white">Boas-vindas</h1>
                        <p className="text-slate-300 mt-2 text-sm">Sistema de Acompanhamento Multidisciplinar</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/20 backdrop-blur-md rounded-xl text-red-100 text-sm font-medium border border-red-500/30">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1">Login</label>
                            <input 
                                type="text"
                                value={login}
                                onChange={e => setLogin(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-white placeholder-slate-500"
                                placeholder="Seu usuário"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1">Senha</label>
                            <input 
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium text-white placeholder-slate-500"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-70 mt-4"
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </form>
                 </div>
             </div>
        </div>
    );
}
