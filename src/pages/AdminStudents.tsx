import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Student } from '../types';

export default function AdminStudents() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
            const data: Student[] = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Student));
            setStudents(data);
            setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));
        return () => unsubscribe();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const newId = crypto.randomUUID();
            await setDoc(doc(db, 'students', newId), {
                name,
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            setName('');
        } catch(err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="space-y-8 text-white">
            <header>
                <h1 className="text-3xl font-bold tracking-tight text-white">Alunos</h1>
                <p className="text-slate-300 mt-1">Gerencie a lista de alunos em acompanhamento.</p>
            </header>

            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                    <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl">
                        <h2 className="text-lg font-semibold mb-6 text-white">Novo Aluno</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nome Completo</label>
                                <input required value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all" />
                            </div>
                            <button disabled={creating} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all disabled:opacity-50 mt-2">
                                {creating ? 'Adicionando...' : 'Adicionar Aluno'}
                            </button>
                        </form>
                    </div>
                </div>
                
                <div className="md:col-span-2">
                     <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl overflow-hidden">
                        <h2 className="text-lg font-semibold mb-6 text-white">Alunos (Acompanhamento)</h2>
                        {loading ? <p className="text-slate-400">Carregando...</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/20 text-sm text-slate-400">
                                            <th className="pb-3 font-medium">Nome</th>
                                            <th className="pb-3 font-medium text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {students.map(s => (
                                            <tr key={s.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-4 font-medium text-white">{s.name}</td>
                                                <td className="py-4 text-right">
                                                    {/* Botão removido a pedido */}
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
    );
}
