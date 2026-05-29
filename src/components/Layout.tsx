import { ReactNode, useState, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { signOut, updatePassword } from 'firebase/auth';
import { LogOut, LayoutDashboard, Users, UserPlus, FileText, KeyRound, X, ClipboardList, MessageCircleHeart } from 'lucide-react';
import { Message, UserProfile, Student } from '../types';

function UnreadMessagesModal() {
    const { profile } = useAuth();
    const [unread, setUnread] = useState<Message[]>([]);
    const [dismissed, setDismissed] = useState(false);
    const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
    const [studentsMap, setStudentsMap] = useState<Record<string, Student>>({});

    useEffect(() => {
        if (!profile?.id) return;
        
        // Listen to all users and students to map names (since it's a small internal app)
        const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
            const m: Record<string, UserProfile> = {};
            snap.forEach(d => m[d.id] = { id: d.id, ...d.data() } as UserProfile);
            setUsersMap(m);
        });
        
        const unsubStudents = onSnapshot(collection(db, 'students'), snap => {
            const m: Record<string, Student> = {};
            snap.forEach(d => m[d.id] = { id: d.id, ...d.data() } as Student);
            setStudentsMap(m);
        });

        const q = query(collection(db, 'messages'), where('receiverId', '==', profile.id));
        const unsubMsg = onSnapshot(q, snap => {
            const data: Message[] = [];
            snap.forEach(d => {
                const msg = { id: d.id, ...d.data() } as Message;
                if (!msg.isRead) data.push(msg); // All without isRead are unread
            });
            setUnread(data);
        });

        return () => { unsubUsers(); unsubStudents(); unsubMsg(); };
    }, [profile?.id]);

    const handleMarkAsRead = async () => {
        setDismissed(true);
        for (const msg of unread) {
            try {
                await updateDoc(doc(db, 'messages', msg.id), { isRead: true });
            } catch(e) {
                console.error("Error marking read", e);
            }
        }
    };

    if (unread.length === 0 || dismissed) return null;

    // Grouping by student
    const byStudent = unread.reduce((acc, msg) => {
        if(!acc[msg.studentId]) acc[msg.studentId] = [];
        acc[msg.studentId].push(msg);
        return acc;
    }, {} as Record<string, Message[]>);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1e1b4b] border border-white/20 p-6 rounded-3xl w-full max-w-md shadow-2xl relative">
                <button onClick={() => setDismissed(true)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-pink-500/20 rounded-2xl border border-pink-500/30">
                        <MessageCircleHeart size={24} className="text-pink-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Novas Mensagens!</h3>
                        <p className="text-sm text-slate-400">Você possui {unread.length} mensagem(ns) não lida(s)</p>
                    </div>
                </div>

                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 mb-6">
                    {Object.entries(byStudent).map(([studentId, msgs]: [string, any]) => (
                        <div key={studentId} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                            <h4 className="text-slate-300 text-sm font-bold border-b border-white/5 pb-2 mb-2">
                                Referente a: <span className="text-white">{studentsMap[studentId]?.name || 'Aluno Desconhecido'}</span>
                            </h4>
                            <div className="space-y-2">
                                {msgs.map(m => (
                                    <div key={m.id} className="text-sm border-l-2 border-pink-500 pl-3 py-1">
                                        <p className="text-white font-medium">{usersMap[m.senderId]?.name || 'Usuário Desconhecido'}</p>
                                        <p className="text-slate-400 line-clamp-1">{m.text}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 text-right">
                                <Link onClick={() => setDismissed(true)} to={`/student/${studentId}`} className="text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider">
                                    Acessar Chat
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={handleMarkAsRead} className="w-full py-3 bg-white/10 text-white border border-white/20 rounded-xl font-bold hover:bg-white/20 transition-all">
                    Marcar Todas como Lidas
                </button>
            </div>
        </div>
    );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!auth.currentUser) return;
        setLoading(true);
        setMsg('');
        try {
            await updatePassword(auth.currentUser, password);
            setMsg('Senha alterada com sucesso!');
            setTimeout(onClose, 1500);
        } catch (err: any) {
            setMsg('Erro ao alterar senha. Talvez seja necessário fazer login novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[#1e1b4b] border border-white/20 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
                <h3 className="text-xl font-bold text-white mb-4">Alterar Senha</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Nova Senha</label>
                        <input 
                            type="password" 
                            required 
                            autoFocus
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none"
                            placeholder="••••••••"
                        />
                    </div>
                    {msg && <p className={`text-sm ${msg.includes('Erro') ? 'text-red-400' : 'text-emerald-400'}`}>{msg}</p>}
                    <button disabled={loading} type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all disabled:opacity-50">
                        {loading ? 'Salvando...' : 'Atualizar Senha'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function Layout({ children }: { children: ReactNode }) {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [showPasswordModal, setShowPasswordModal] = useState(false);

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#581c87] text-white font-sans selection:bg-purple-500/30">
            <UnreadMessagesModal />
            {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
            {/* Background elements */}
            <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] opacity-50"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[100px] opacity-50"></div>
            </div>

            <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/10 backdrop-blur-xl border-b border-white/20 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-400 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/30">Σ</div>
                            <span className="text-xl font-semibold tracking-tight text-white">Acompanhamento</span>
                        </div>
                        
                        <div className="hidden md:flex space-x-2">
                             <NavLink to="/" className={({isActive}) => `flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white/20 text-white shadow-sm border border-white/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                                <LayoutDashboard size={18} />
                                <span>Painel</span>
                             </NavLink>
                             {profile?.role === 'admin' && (
                                <>
                                 <NavLink to="/admin/users" className={({isActive}) => `flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white/20 text-white shadow-sm border border-white/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                                    <Users size={18} />
                                    <span>Usuários</span>
                                 </NavLink>
                                 <NavLink to="/admin/students" className={({isActive}) => `flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white/20 text-white shadow-sm border border-white/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                                    <UserPlus size={18} />
                                    <span>Alunos</span>
                                 </NavLink>
                                 <NavLink to="/admin/logs" className={({isActive}) => `flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-white/20 text-white shadow-sm border border-white/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
                                    <ClipboardList size={18} />
                                    <span>Logs</span>
                                 </NavLink>
                                </>
                             )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="text-sm text-slate-300 hidden md:flex items-center gap-2">
                            <span className="font-medium text-white">{profile?.name}</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold uppercase tracking-wider">{profile?.role}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setShowPasswordModal(true)} className="p-2 rounded-xl text-slate-300 hover:bg-white/10 transition-colors" title="Alterar Senha">
                                <KeyRound size={20} />
                            </button>
                            <button onClick={handleLogout} className="p-2 rounded-xl text-slate-300 hover:bg-white/10 transition-colors" title="Sair">
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
                {children}
            </main>
        </div>
    );
}
