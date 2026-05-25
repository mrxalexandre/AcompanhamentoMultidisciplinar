import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { ShieldAlert, Trash2, Pen } from 'lucide-react';

interface Log {
    id: string;
    action: string;
    collection: string;
    recordId: string;
    studentId: string;
    userId: string;
    userName: string;
    createdAt: number;
}

export default function AdminLogs() {
    const { profile } = useAuth();
    const [logs, setLogs] = useState<Log[]>([]);

    useEffect(() => {
        if (profile?.role !== 'admin') return;
        
        const q = query(collection(db, 'logs'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            const data: Log[] = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() } as Log));
            setLogs(data);
        });

        return () => unsub();
    }, [profile]);

    if (profile?.role !== 'admin') {
        return <div className="p-8 text-white">Acesso negado. Apenas administradores.</div>;
    }

    return (
        <div className="space-y-6">
            <header className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl flex items-center gap-4">
                <div className="p-4 bg-orange-500/20 rounded-2xl border border-orange-500/30">
                    <ShieldAlert size={32} className="text-orange-400" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white">Logs de Auditoria</h1>
                    <p className="text-slate-400 mt-1">Histórico de alterações e exclusões do sistema</p>
                </div>
            </header>

            <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead>
                            <tr className="border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
                                <th className="pb-3 font-medium">Data/Hora</th>
                                <th className="pb-3 font-medium">Usuário</th>
                                <th className="pb-3 font-medium">Ação</th>
                                <th className="pb-3 font-medium">Registro (ID)</th>
                                <th className="pb-3 font-medium">Estudante (ID)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-4 font-mono text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                                    <td className="py-4">
                                        <span className="font-semibold text-white">{log.userName}</span>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            {log.action === 'delete' ? <Trash2 size={14} className="text-red-400" /> : <Pen size={14} className="text-blue-400" />}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border ${log.action === 'delete' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-blue-500/20 text-blue-300 border-blue-500/30'}`}>
                                                {log.action === 'delete' ? 'Exclusão' : 'Edição'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4">
                                        <span className="text-xs">{log.collection} / <span className="font-mono text-slate-500">{log.recordId}</span></span>
                                    </td>
                                    <td className="py-4">
                                        <span className="font-mono text-slate-500 text-xs">{log.studentId}</span>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-400">Nenhum log registrado.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
