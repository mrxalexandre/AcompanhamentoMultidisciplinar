import React, { useState } from 'react';
import { addDoc, updateDoc, doc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { ProfessionalRecord } from '../types';

export default function ProfessionalForm({ studentId, onSuccess, initialData }: { studentId: string, onSuccess: () => void, initialData?: ProfessionalRecord }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [text, setText] = useState(initialData?.text || '');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!text.trim()) return;
        setLoading(true);
        try {
            if (initialData?.id) {
                await updateDoc(doc(db, 'professionalRecords', initialData.id), { text });
                await addDoc(collection(db, 'logs'), {
                    action: 'update',
                    collection: 'professionalRecords',
                    recordId: initialData.id,
                    studentId,
                    userId: profile?.id,
                    userName: profile?.name,
                    createdAt: Date.now()
                });
            } else {
                await addDoc(collection(db, 'professionalRecords'), {
                    studentId,
                    professionalId: profile?.id,
                    professionalRole: profile?.role,
                    text,
                    createdAt: Date.now()
                });
            }
            onSuccess();
        } catch (error) {
            handleFirestoreError(error, initialData?.id ? OperationType.UPDATE : OperationType.CREATE, 'professionalRecords');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-indigo-900/40 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl space-y-6">
             <h3 className="text-xl font-bold text-white">{initialData ? 'Editar Diário de Visita' : 'Diário de Visita - Especialista'}</h3>
             
             <div>
                 <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 ml-1">Relatório da Sessão</label>
                 <textarea required value={text} onChange={e => setText(e.target.value)} className="w-full h-40 px-4 py-3 bg-white/10 text-white placeholder-slate-400 border border-white/20 rounded-2xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all resize-none"></textarea>
             </div>

             <div className="flex justify-end gap-3">
                 <button type="button" onClick={onSuccess} className="px-5 py-2.5 text-slate-300 font-bold hover:bg-white/10 hover:text-white rounded-xl transition-colors">Cancelar</button>
                 <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/30 disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Diário'}
                 </button>
             </div>
        </form>
    );
}
