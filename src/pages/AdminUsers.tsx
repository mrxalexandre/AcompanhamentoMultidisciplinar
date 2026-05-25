import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, adminAuth, handleFirestoreError, OperationType } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { UserProfile, Role } from '../types';

export default function AdminUsers() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({ login: '', name: '', role: 'professor' as Role });

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const data: UserProfile[] = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as UserProfile));
            setUsers(data);
            setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));
        return () => unsubscribe();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        try {
            const email = `${form.login}@sistema.local`;
            
            let initialPassword = form.login;
            if (initialPassword.length > 0 && initialPassword.length < 6) {
                initialPassword = initialPassword.padEnd(6, form.login);
            }

            // Crie no secondary app for admin preventing sign out
            const userCredential = await createUserWithEmailAndPassword(adminAuth, email, initialPassword);
            
            const newUser: Omit<UserProfile, 'id'> = {
                email,
                name: form.name,
                role: form.role,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await setDoc(doc(db, 'users', userCredential.user.uid), newUser);
            setForm({ login: '', name: '', role: 'professor' });
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/operation-not-allowed') {
                setError('Autenticação por Email/Senha desativada. Ative-a no Firebase Console.');
            } else {
                setError('Erro ao criar usuário: ' + err.message);
            }
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-8 text-white">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-white">Gerenciar Usuários</h1>
                <p className="text-slate-300 mt-1">Cadastre profissionais, pais e outros administradores.</p>
            </header>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                        <h2 className="text-lg font-semibold mb-6 text-white">Novo Usuário</h2>
                        {error && <div className="mb-4 text-sm text-red-100 bg-red-500/20 border border-red-500/30 p-3 rounded-xl">{error}</div>}
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Login (Senha será igual)</label>
                                <input required value={form.login} onChange={e => setForm({...form, login: e.target.value.toLowerCase()})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nome Completo</label>
                                <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Perfil</label>
                                <select value={form.role} onChange={e => setForm({...form, role: e.target.value as Role})} className="w-full px-4 py-2.5 bg-black/40 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all">
                                    <option value="admin" className="bg-slate-900">Administrador</option>
                                    <option value="professor" className="bg-slate-900">Professor</option>
                                    <option value="psychologist" className="bg-slate-900">Psicólogo</option>
                                    <option value="psychopedagogue" className="bg-slate-900">Psicopedagogo</option>
                                    <option value="speech_therapist" className="bg-slate-900">Fonoaudiólogo</option>
                                    <option value="parent" className="bg-slate-900">Pais/Responsável</option>
                                </select>
                            </div>
                            <button disabled={creating} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-500 shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 mt-2">
                                {creating ? 'Cadastrando...' : 'Cadastrar Usuário'}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="md:col-span-2">
                     <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
                        <h2 className="text-lg font-semibold mb-6 text-white">Usuários Cadastrados</h2>
                        {loading ? <p className="text-slate-400">Carregando...</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/20 text-sm text-slate-400">
                                            <th className="pb-3 font-medium">Nome</th>
                                            <th className="pb-3 font-medium">Login</th>
                                            <th className="pb-3 font-medium">Perfil</th>
                                            <th className="pb-3 font-medium text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-4 font-medium text-white">{u.name}</td>
                                                <td className="py-4 text-slate-300">{u.email.replace('@sistema.local', '')}</td>
                                                <td className="py-4">
                                                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/20 border border-blue-500/30 text-blue-300 uppercase tracking-widest">{u.role}</span>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <button 
                                                        onClick={() => alert(`Ação não suportada puramente via cliente. Para resetar a senha do usuário ${u.name}, por favor acesse o Firebase Console ou requisite integração de backend com Admin SDK.`)}
                                                        className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                                    >
                                                        Resetar Senha
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                     </div>
                </div>
            </div>
        </div>
    )
}
