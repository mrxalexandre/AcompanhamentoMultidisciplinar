import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ProfessorRecord } from '../types';
import { useAuth } from '../AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Printer } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const legends: Record<string, Record<string, string>> = {
    'Conc.': { 'MC': 'Muito Concentrado', 'MD': 'Médio', 'DR': 'Disperso Rápido', 'NC': 'Não Concentrado' },
    'Foco': { 'R': 'Rápido', 'MT': 'Médio Tempo', 'AD': 'Adequado', 'TP': 'Tempo Prolongado' },
    'Espera': { 'AT': 'Atento', 'AL': 'Alheio', 'DI': 'Disperso' },
    'Org.': { 'M': 'Mantém', 'OL': 'Organização Leve', 'NF': 'Necessita Foco', 'AG': 'Agitado' },
    'Concl.': { 'C': 'Conclui', 'CP': 'Conclui Parcialmente', 'NA': 'Não Atinge', 'NC': 'Não Conclui' },
    'Humor': { 'MH': 'Muito Humor', 'AO': 'Oscilante', 'DA': 'Desmotivado', 'AI': 'Alegre/Interativo' }
};

export default function ConsolidatedReport() {
    const { profile, loading: authLoading } = useAuth();
    const [records, setRecords] = useState<ProfessorRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'professorRecords'), (snapshot) => {
            const data: ProfessorRecord[] = [];
            snapshot.forEach(doc => data.push({ id: doc.id, ...doc.data() } as ProfessorRecord));
            setRecords(data);
            setLoading(false);
        }, (error) => handleFirestoreError(error, OperationType.LIST, 'professorRecords'));
        return () => unsubscribe();
    }, []);

    if (authLoading || loading) {
        return <div className="text-center py-12 text-slate-300 font-medium animate-pulse">Carregando relatório...</div>;
    }

    if (!profile || (profile.role !== 'admin' && !profile.canViewDashboard)) {
        return <Navigate to="/" replace />;
    }

    // Grouping by discipline
    const byDiscipline: Record<string, ProfessorRecord[]> = {};
    records.forEach(r => {
        if (!byDiscipline[r.discipline]) byDiscipline[r.discipline] = [];
        byDiscipline[r.discipline].push(r);
    });

    const disciplines = Object.keys(byDiscipline).sort();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8 pb-12">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Relatório Consolidado Geral</h1>
                    <p className="text-slate-300">Visão geral do desempenho de todos os alunos agrupado por disciplina.</p>
                </div>
                <div>
                    <button 
                        onClick={handlePrint}
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all"
                    >
                        <Printer size={20} />
                        Imprimir Relatório
                    </button>
                </div>
            </header>
            
            <div className="hidden print:block mb-8">
                <h1 className="text-2xl font-bold text-black border-b border-black pb-2">Relatório Consolidado Geral</h1>
                <p className="text-sm mt-2">Visão geral de desempenho por disciplina.</p>
            </div>

            {disciplines.length === 0 ? (
                 <div className="bg-white/10 p-12 rounded-3xl text-center text-slate-300">Não há dados suficientes para gerar o relatório.</div>
            ) : (
                <div className="space-y-12">
                    {disciplines.map(disc => {
                        const recs = byDiscipline[disc];
                        const countMetric = (field: keyof ProfessorRecord) => {
                            const map: Record<string, number> = {};
                            recs.forEach(r => {
                                const val = r[field] as string;
                                if (val) map[val] = (map[val] || 0) + 1;
                            });
                            return map;
                        };

                        const conc = countMetric('concentration');
                        const focus = countMetric('focus');
                        const wait = countMetric('wait');
                        const org = countMetric('organization');
                        const conc2 = countMetric('conclusion');
                        const mood = countMetric('mood');

                        return (
                            <div key={disc} className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl shadow-xl print:bg-transparent print:border-none print:shadow-none print:p-0 print:break-inside-avoid print:mb-12">
                                <h2 className="text-2xl font-bold text-white mb-6 print:text-black">Disciplina: {disc} <span className="text-sm font-medium text-slate-400 print:text-black/70">({recs.length} registro{recs.length > 1 ? 's' : ''})</span></h2>
                                
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <ChartCard title="Concentração" map={conc} labelDict={legends['Conc.']} />
                                    <ChartCard title="Foco" map={focus} labelDict={legends['Foco']} />
                                    <ChartCard title="Espera" map={wait} labelDict={legends['Espera']} />
                                    <ChartCard title="Organização" map={org} labelDict={legends['Org.']} />
                                    <ChartCard title="Conclusão" map={conc2} labelDict={legends['Concl.']} />
                                    <ChartCard title="Humor" map={mood} labelDict={legends['Humor']} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ChartCard({ title, map, labelDict }: { title: string, map: Record<string, number>, labelDict: Record<string, string> }) {
    const data = Object.keys(map).map(k => ({
        name: k,
        tooltipName: labelDict[k] || k,
        value: map[k]
    })).sort((a, b) => b.value - a.value);

    return (
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl print:bg-white print:border-gray-300">
            <h3 className="font-bold text-lg text-slate-200 mb-4 print:text-black">{title}</h3>
            {data.length === 0 ? (
                <div className="text-sm text-slate-400 flex items-center justify-center h-48">Sem dados</div>
            ) : (
                <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" vertical={false} />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} />
                            <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                            <Tooltip 
                                labelFormatter={(label) => labelDict[label as string] || label}
                                formatter={(value, name, props) => [value, props.payload.tooltipName]}
                                contentStyle={{ backgroundColor: '#1e1b4b', borderColor: '#ffffff20', color: '#fff', borderRadius: '12px' }}
                                itemStyle={{ color: '#fff' }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
