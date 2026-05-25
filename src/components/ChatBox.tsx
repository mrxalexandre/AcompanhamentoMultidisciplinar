import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, query, where, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Message, UserProfile } from '../types';
import { useAuth } from '../AuthContext';
import { Send } from 'lucide-react';

export default function ChatBox({ studentId }: { studentId: string }) {
    const { profile } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [users, setUsers] = useState<Record<string, UserProfile>>({});
    const [text, setText] = useState('');
    const [receiverId, setReceiverId] = useState('');
    
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Fetch all users to map sender names and populate contacts (since it's a small internal app)
        const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
             const userMap: Record<string, UserProfile> = {};
             snap.forEach(d => {
                 userMap[d.id] = { id: d.id, ...d.data() } as UserProfile;
             });
             setUsers(userMap);
        }, err => handleFirestoreError(err, OperationType.LIST, 'users'));

        const q = query(collection(db, 'messages'), where('studentId', '==', studentId));
        const unsubMsg = onSnapshot(q, snap => {
             const data: Message[] = [];
             snap.forEach(d => data.push({ id: d.id, ...d.data() } as Message));
             setMessages(data.sort((a,b) => a.createdAt - b.createdAt));
        }, err => handleFirestoreError(err, OperationType.LIST, 'messages'));

        return () => { unsubUsers(); unsubMsg(); };
    }, [studentId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!text.trim() || !receiverId) return;

        try {
            await addDoc(collection(db, 'messages'), {
                studentId,
                senderId: profile?.id,
                receiverId,
                text,
                createdAt: Date.now()
            });
            setText('');
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'messages');
        }
    };

    // Filter messages relevant to the current user (sent by them or received by them)
    // Actually, admins might see all? No, the rule restricts to sender/receiver or admin.
    const relevantMessages = profile?.role === 'admin' 
        ? messages 
        : messages.filter(m => m.senderId === profile?.id || m.receiverId === profile?.id);

    // If I'm a parent, I can select any professional to talk to.
    // If I'm a professional, I can talk to the parent.
    const contacts = Object.values(users).filter(u => u.id !== profile?.id && u.role !== 'admin');

    return (
        <div className="flex bg-white/5 backdrop-blur-3xl h-[600px] w-full border border-white/10 rounded-3xl overflow-hidden shadow-2xl text-white">
            {/* Contacts Sidebar */}
            <div className="w-1/3 border-r border-white/10 flex flex-col bg-white/5">
                <div className="p-5 border-b border-white/10">
                    <h3 className="font-semibold text-white">Contatos</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {contacts.map(c => (
                        <button key={c.id} onClick={() => setReceiverId(c.id)} className={`w-full text-left px-5 py-4 flex flex-col border-b border-white/5 hover:bg-white/10 transition-colors ${receiverId === c.id ? 'bg-white/10 shadow-sm border-l-4 border-l-blue-400' : ''}`}>
                             <span className="font-bold text-white">{c.name}</span>
                             <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">{c.role}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-900/40">
                {receiverId ? (
                    <>
                        <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center backdrop-blur-md">
                            <div>
                                <span className="font-semibold text-white block">{users[receiverId]?.name}</span>
                                <span className="text-xs text-slate-400">{users[receiverId]?.role}</span>
                            </div>
                        </div>
                        
                        <div className="flex-1 p-6 overflow-y-auto space-y-4">
                            {relevantMessages.filter(m => (m.senderId === receiverId || m.receiverId === receiverId) || (profile?.role==='admin' && (m.senderId === receiverId || m.receiverId === receiverId))).map(m => {
                                const isMe = m.senderId === profile?.id;
                                return (
                                    <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl ${isMe ? 'bg-blue-600 text-white rounded-br-sm shadow-xl' : 'bg-white/10 border border-white/20 text-slate-200 rounded-bl-sm shadow-xl'}`}>
                                            <p className="text-sm">{m.text}</p>
                                            <span className={`text-[10px] block mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                                {new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <div className="p-4 bg-white/5 backdrop-blur-md border-t border-white/10">
                            <form onSubmit={handleSend} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={text} 
                                    onChange={e => setText(e.target.value)} 
                                    placeholder="Digite sua mensagem..." 
                                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white placeholder-slate-400 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none transition-all shadow-xl"
                                />
                                <button type="submit" className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/30">
                                    <Send size={20} />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 mb-4 flex items-center justify-center shadow-2xl">
                            <Send size={24} className="text-slate-400" />
                        </div>
                        <p>Selecione um contato para trocar mensagens</p>
                    </div>
                )}
            </div>
        </div>
    )
}
