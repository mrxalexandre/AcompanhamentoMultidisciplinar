import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, deleteDoc, collection, onSnapshot, query, where, orderBy, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { Student, ProfessorRecord, ProfessionalRecord, Message } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Download, FileText, FileSpreadsheet, PlusCircle, Pen, Trash2 } from 'lucide-react';
import ProfessorForm from '../components/ProfessorForm';
import ProfessionalForm from '../components/ProfessionalForm';
import ChatBox from '../components/ChatBox';

export default function StudentDetail() {
    const { id } = useParams<{id: string}>();
    const { profile } = useAuth();
    const [student, setStudent] = useState<Student | null>(null);
    const [profRecords, setProfRecords] = useState<ProfessorRecord[]>([]);
    const [professionalRecords, setProfessionalRecords] = useState<ProfessionalRecord[]>([]);
    const [users, setUsers] = useState<Record<string, any>>({});
    const [tab, setTab] = useState<'records' | 'chat'>('records');
    
    // For Forms
    const [showProfForm, setShowProfForm] = useState(false);
    const [showProfessionalForm, setShowProfessionalForm] = useState(false);
    const [editingProfRecord, setEditingProfRecord] = useState<ProfessorRecord | undefined>();
    const [editingProfessionalRecord, setEditingProfessionalRecord] = useState<ProfessionalRecord | undefined>();

    // Filters
    const [filterDate, setFilterDate] = useState('');
    const [filterProfessionalId, setFilterProfessionalId] = useState('');

    useEffect(() => {
        if (!id) return;
        const fetchStudent = async () => {
            const snap = await getDoc(doc(db, 'students', id));
            if (snap.exists()) setStudent({ id: snap.id, ...snap.data() } as Student);
        }
        fetchStudent();

        const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
            const userMap: Record<string, any> = {};
            snap.forEach(d => {
                userMap[d.id] = { id: d.id, ...d.data() };
            });
            setUsers(userMap);
        });

        const q1 = query(collection(db, 'professorRecords'), where('studentId', '==', id));
        const unsub1 = onSnapshot(q1, snap => {
            const data: ProfessorRecord[] = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() } as ProfessorRecord));
            setProfRecords(data.sort((a,b) => b.createdAt - a.createdAt));
        }, err => handleFirestoreError(err, OperationType.LIST, 'professorRecords'));

        const q2 = query(collection(db, 'professionalRecords'), where('studentId', '==', id));
        const unsub2 = onSnapshot(q2, snap => {
            const data: ProfessionalRecord[] = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() } as ProfessionalRecord));
            setProfessionalRecords(data.sort((a,b) => b.createdAt - a.createdAt));
        }, err => handleFirestoreError(err, OperationType.LIST, 'professionalRecords'));

        return () => { unsub1(); unsub2(); unsubUsers(); };
    }, [id]);

    const exportPDF = () => {
        const doc = new jsPDF();
        doc.text(`Relatório do Aluno: ${student?.name}`, 14, 15);
        autoTable(doc, {
            startY: 25,
            head: [['Data', 'Professor', 'Disciplina', 'Conc.', 'Foco', 'Esp.', 'Org.', 'Concl.', 'Humor']],
            body: profRecords.map(r => [
                new Date(r.createdAt).toLocaleDateString(),
                'Prof', // Would lookup user name in real app
                r.discipline,
                r.concentration,
                r.focus,
                r.wait,
                r.organization,
                r.conclusion,
                r.mood,
            ])
        });
        doc.save(`${student?.name}_relatorio.pdf`);
    };

    const exportCSV = () => {
         const csv = Papa.unparse(profRecords.map(r => ({
             Data: new Date(r.createdAt).toLocaleDateString(),
             Disciplina: r.discipline,
             Concentração: r.concentration,
             Foco: r.focus,
             Espera: r.wait,
             Organização: r.organization,
             Conclusão: r.conclusion,
             Humor: r.mood,
             Observações: r.additionalObservations
         })));
         const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
         const url = URL.createObjectURL(blob);
         const link = document.createElement("a");
         link.setAttribute("href", url);
         link.setAttribute("download", `${student?.name}_relatorio.csv`);
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
    };

    if (!student) return <div className="p-8">Carregando...</div>;

    const isProfessor = profile?.role === 'professor';
    const isSpecialist = ['psychologist', 'psychopedagogue', 'speech_therapist'].includes(profile?.role || '');
    const isAdmin = profile?.role === 'admin';
    const isParent = profile?.role === 'parent';

    const filteredProfRecords = profRecords.filter(r => {
        if (filterDate && new Date(r.createdAt).toISOString().split('T')[0] !== filterDate) return false;
        if (filterProfessionalId && r.professorId !== filterProfessionalId) return false;
        return true;
    });

    const filteredProfessionalRecords = professionalRecords.filter(r => {
        if (filterDate && new Date(r.createdAt).toISOString().split('T')[0] !== filterDate) return false;
        if (filterProfessionalId && r.professionalId !== filterProfessionalId) return false;
        return true;
    });

    const allProfessionals = Object.values(users).filter(u => u.role !== 'admin' && u.role !== 'parent');

    const handleDeleteRecord = async (collectionName: string, recordId: string) => {
        if (!window.confirm('Tem certeza que deseja excluir este registro?')) return;
        try {
            await deleteDoc(doc(db, collectionName, recordId));
            await addDoc(collection(db, 'logs'), {
                action: 'delete',
                collection: collectionName,
                recordId,
                studentId: id,
                userId: profile?.id,
                userName: profile?.name,
                createdAt: Date.now()
            });
        } catch(e) {
            handleFirestoreError(e, OperationType.DELETE, collectionName);
        }
    };

    return (
        <div className="space-y-6 text-white">
            <header className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col items-start gap-4">
                <div className="flex-1">
                    <h1 className="text-3xl font-bold tracking-tight text-white">{student.name}</h1>
                    <p className="text-slate-400 mt-1">Prontuário de Acompanhamento</p>
                </div>
                {isAdmin && (
                    <div className="flex gap-3">
                        <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 bg-blue-500/30 text-blue-200 rounded-xl font-bold hover:bg-blue-500/50 transition-colors border border-blue-500/30">
                            <FileText size={18} />
                            PDF
                        </button>
                        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-purple-500/30 text-purple-200 rounded-xl font-bold hover:bg-purple-500/50 transition-colors border border-purple-500/30">
                            <FileSpreadsheet size={18} />
                            CSV
                        </button>
                    </div>
                )}
            </header>

            <div className="flex gap-4 border-b border-white/20 pb-2">
                <button onClick={() => setTab('records')} className={`px-4 py-2 font-bold transition-colors ${tab === 'records' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>Registros</button>
                <button onClick={() => setTab('chat')} className={`px-4 py-2 font-bold transition-colors ${tab === 'chat' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400 hover:text-slate-200'}`}>Comunicação (Chat)</button>
            </div>

            {tab === 'records' && (
                <div className="space-y-8">
                     {/* Action Buttons and Filters */}
                     <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-white/10 pb-6">
                         <div className="flex gap-3">
                            {isProfessor && (
                                <button onClick={() => { setEditingProfRecord(undefined); setShowProfForm(!showProfForm); }} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-all">
                                    <PlusCircle size={18} />
                                    Lançar Registro Diário
                                </button>
                            )}
                            {isSpecialist && (
                                <button onClick={() => { setEditingProfessionalRecord(undefined); setShowProfessionalForm(!showProfessionalForm); }} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-md shadow-indigo-500/20 hover:bg-indigo-700 transition-all">
                                    <PlusCircle size={18} />
                                    Lançar Diário de Visita
                                </button>
                            )}
                         </div>

                         <div className="flex flex-col sm:flex-row gap-3">
                            <input 
                                type="date" 
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                                className="px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                                title="Filtrar por Data"
                            />
                            <select 
                                value={filterProfessionalId}
                                onChange={e => setFilterProfessionalId(e.target.value)}
                                className="px-4 py-2.5 bg-black/40 border border-white/20 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                                title="Filtrar por Profissional"
                            >
                                <option value="" className="bg-slate-900">Todos os Profissionais</option>
                                {allProfessionals.map(p => (
                                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name} ({p.role})</option>
                                ))}
                            </select>
                         </div>
                     </div>

                     {showProfForm && isProfessor && id && (
                         <ProfessorForm studentId={id} onSuccess={() => setShowProfForm(false)} initialData={editingProfRecord} />
                     )}
                     
                     {showProfessionalForm && isSpecialist && id && (
                         <ProfessionalForm studentId={id} onSuccess={() => setShowProfessionalForm(false)} initialData={editingProfessionalRecord} />
                     )}

                     <div className="grid lg:grid-cols-2 gap-8">
                         {/* Diário de Professores */}
                         <div>
                             <h2 className="text-xl font-semibold mb-4 text-white">Registros Diários (Professores)</h2>
                             
                             <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4 text-xs text-slate-300">
                                 <h3 className="font-bold text-white mb-2 uppercase tracking-wide text-[10px]">Legenda de Avaliação</h3>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                                     <div><strong className="text-blue-300">Concentração:</strong> MC: Muito Conc. | MD: Médio | DR: Disp. Rápido | NC: Não Conc.</div>
                                     <div><strong className="text-blue-300">Foco:</strong> R: Rápido | MT: Médio Tempo | AD: Adequado | TP: Tempo Prolong.</div>
                                     <div><strong className="text-blue-300">Espera:</strong> AT: Atento | AL: Alheio | DI: Disperso</div>
                                     <div><strong className="text-blue-300">Organização:</strong> M: Mantém | OL: Org. Leve | NF: Nec. Foco | AG: Agitado</div>
                                     <div><strong className="text-blue-300">Conclusão:</strong> C: Conclui | CP: Parcial | NA: Não Atinge | NC: Não Conclui</div>
                                     <div><strong className="text-blue-300">Humor:</strong> MH: Muito Humor | AO: Oscilante | DA: Desmotivado | AI: Alegre/Interat.</div>
                                 </div>
                             </div>

                             <div className="space-y-4">
                                {filteredProfRecords.map(r => (
                                    <div key={r.id} className="bg-white/10 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-2xl">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="font-semibold text-white">{r.discipline}</span>
                                                <span className="text-xs text-slate-400 block mt-0.5">{new Date(r.createdAt).toLocaleString()}</span>
                                                {users[r.professorId] && (
                                                    <span className="text-xs text-blue-300 block mt-1">Por: {users[r.professorId].name}</span>
                                                )}
                                            </div>
                                            {(isAdmin || profile?.id === r.professorId) && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setEditingProfRecord(r); setShowProfForm(true); }} className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors" title="Editar">
                                                        <Pen size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteRecord('professorRecords', r.id)} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors" title="Excluir">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 mt-4">
                                            <Metric label="Conc." val={r.concentration} />
                                            <Metric label="Foco" val={r.focus} />
                                            <Metric label="Espera" val={r.wait} />
                                            <Metric label="Org." val={r.organization} />
                                            <Metric label="Concl." val={r.conclusion} />
                                            <Metric label="Humor" val={r.mood} />
                                        </div>
                                        {r.additionalObservations && (
                                            <div className="mt-4 text-sm text-slate-300 bg-white/5 p-3 rounded-xl border border-white/10">
                                                <strong className="text-blue-300">Obs:</strong> {r.additionalObservations}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {filteredProfRecords.length === 0 && <p className="text-slate-400 text-sm">Nenhum registro encontrado.</p>}
                             </div>
                         </div>

                         {/* Diário de Especialistas */}
                         <div>
                             <h2 className="text-xl font-semibold mb-4 text-white">Diário de Especialistas</h2>
                             <div className="space-y-4">
                                {filteredProfessionalRecords.map(r => (
                                    <div key={r.id} className="bg-indigo-900/40 backdrop-blur-md p-5 rounded-3xl border border-white/10 shadow-2xl">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="font-semibold text-blue-300 bg-blue-500/20 border border-blue-500/30 px-3 py-1 rounded-full text-xs uppercase tracking-wide">{r.professionalRole}</span>
                                                <span className="text-xs text-slate-400 block mt-2">{new Date(r.createdAt).toLocaleString()}</span>
                                                {users[r.professionalId] && (
                                                    <span className="text-xs text-blue-300 block mt-1">Por: {users[r.professionalId].name}</span>
                                                )}
                                            </div>
                                            {(isAdmin || profile?.id === r.professionalId) && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setEditingProfessionalRecord(r); setShowProfessionalForm(true); }} className="p-2 bg-white/5 border border-white/10 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition-colors" title="Editar">
                                                        <Pen size={14} />
                                                    </button>
                                                    <button onClick={() => handleDeleteRecord('professionalRecords', r.id)} className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors" title="Excluir">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-3 text-slate-200 leading-relaxed whitespace-pre-wrap">{r.text}</p>
                                    </div>
                                ))}
                                {filteredProfessionalRecords.length === 0 && <p className="text-slate-400 text-sm">Nenhum registro encontrado.</p>}
                             </div>
                         </div>
                     </div>
                </div>
            )}

            {tab === 'chat' && id && (
                <div className="h-[600px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl">
                    <ChatBox studentId={id} />
                </div>
            )}
        </div>
    );
}

function Metric({ label, val }: { label: string, val: string }) {
    return (
        <div className="bg-white/5 rounded-xl p-2 text-center border border-white/10">
            <div className="text-[10px] uppercase font-bold text-slate-400 leading-tight">{label}</div>
            <div className="font-semibold tracking-tight text-white">{val}</div>
        </div>
    )
}
