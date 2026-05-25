import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Student } from '../types';
import { useAuth } from '../AuthContext';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { profile } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'students'), (snapshot) => {
            const data: Student[] = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as Student));
            setStudents(data);
            setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));
        return () => unsubscribe();
    }, []);

    const filtered = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Painel de Acompanhamento</h1>
                    <p className="text-slate-300 mt-1">Bem-vindo, <span className="font-semibold text-white">{profile?.name}</span>. Selecione um aluno para visualizar ou adicionar registros.</p>
                </div>
                <div className="relative max-w-sm w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar aluno..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-xl"
                    />
                </div>
            </header>

            {loading ? (
                 <div className="text-center py-12 text-slate-300 font-medium animate-pulse">Carregando alunos...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map(student => (
                         <Link key={student.id} to={`/student/${student.id}`} className="group relative block bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl hover:bg-white/15 transition-all hover:-translate-y-1">
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-3xl"></div>
                             <h3 className="text-xl font-semibold text-white">{student.name}</h3>
                             <p className="text-sm text-slate-400 mt-2">Clique para ver o prontuário completo</p>
                             <div className="mt-6 flex justify-end">
                                 <span className="text-blue-400 font-bold text-xs uppercase tracking-widest drop-shadow-sm group-hover:text-blue-300 transition-colors">Acessar Prontuário →</span>
                             </div>
                         </Link>
                    ))}
                    {filtered.length === 0 && (
                        <div className="col-span-full text-center py-12 text-slate-400 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                            Nenhum aluno encontrado.
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
