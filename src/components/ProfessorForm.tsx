import React, { useState } from 'react';
import { addDoc, updateDoc, doc, collection } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { ProfessorRecord } from '../types';

export default function ProfessorForm({ studentId, onSuccess, initialData }: { studentId: string, onSuccess: () => void, initialData?: ProfessorRecord }) {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        discipline: initialData?.discipline || 'Portugues',
        concentration: initialData?.concentration || 'MC',
        focus: initialData?.focus || 'R',
        wait: initialData?.wait || 'AT',
        organization: initialData?.organization || 'M',
        conclusion: initialData?.conclusion || 'C',
        mood: initialData?.mood || 'MH',
        additionalObservations: initialData?.additionalObservations || ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (initialData?.id) {
                await updateDoc(doc(db, 'professorRecords', initialData.id), form);
                await addDoc(collection(db, 'logs'), {
                    action: 'update',
                    collection: 'professorRecords',
                    recordId: initialData.id,
                    studentId,
                    userId: profile?.id,
                    userName: profile?.name,
                    createdAt: Date.now()
                });
            } else {
                await addDoc(collection(db, 'professorRecords'), {
                    ...form,
                    studentId,
                    professorId: profile?.id,
                    createdAt: Date.now()
                });
            }
            onSuccess();
        } catch (error) {
            handleFirestoreError(error, initialData?.id ? OperationType.UPDATE : OperationType.CREATE, 'professorRecords');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl space-y-6">
             <h3 className="text-xl font-bold text-white">{initialData ? 'Editar Lançamento' : 'Lançamento Diário'}</h3>
             
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                 <SelectField label="Disciplina" val={form.discipline} setVal={v => setForm({...form, discipline: v})} opts={["Portugues", "matematica", "historia", "ciencias", "ensaio", "educação fisica", "pratica textual", "lider em mim", "ingles", "arte", "musica"]} />
                 <SelectField label="Concentração" val={form.concentration} setVal={v => setForm({...form, concentration: v})} opts={["MC", "MD", "DR", "NC"]} />
                 <SelectField label="Foco" val={form.focus} setVal={v => setForm({...form, focus: v})} opts={["R", "MT", "AD", "TP"]} />
                 <SelectField label="Espera" val={form.wait} setVal={v => setForm({...form, wait: v})} opts={["AT", "AL", "DI"]} />
                 <SelectField label="Organização" val={form.organization} setVal={v => setForm({...form, organization: v})} opts={["M", "OL", "NF", "AG"]} />
                 <SelectField label="Conclusão" val={form.conclusion} setVal={v => setForm({...form, conclusion: v})} opts={["C", "CP", "NA", "NC"]} />
                 <SelectField label="Humor" val={form.mood} setVal={v => setForm({...form, mood: v})} opts={["MH", "AO", "DA", "AI"]} />
             </div>
             
             <div>
                 <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Observações Adicionais</label>
                 <textarea value={form.additionalObservations} onChange={e => setForm({...form, additionalObservations: e.target.value})} className="w-full h-24 px-4 py-3 bg-white/5 border border-white/20 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none"></textarea>
             </div>

             <div className="flex justify-end gap-3">
                 <button type="button" onClick={onSuccess} className="px-5 py-2.5 text-slate-300 font-bold hover:bg-white/10 rounded-xl transition-colors">Cancelar</button>
                 <button type="submit" disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50">
                    {loading ? 'Salvando...' : 'Salvar Registro'}
                 </button>
             </div>
        </form>
    );
}

function SelectField({label, val, setVal, opts}: {label:string, val:string, setVal:(v:string)=>void, opts:string[]}) {
    return (
        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{label}</label>
            <select value={val} onChange={e => setVal(e.target.value)} className="w-full px-4 py-3 bg-black/40 text-white border border-white/20 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all cursor-pointer">
                {opts.map(o => <option key={o} value={o} className="bg-slate-900 text-white">{o.toUpperCase()}</option>)}
            </select>
        </div>
    )
}
