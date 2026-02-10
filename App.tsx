
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, Clock, Trash2, CheckCircle, XCircle, Plus, LogOut, Settings, 
  LayoutDashboard, Instagram, MapPin, Sparkles, Loader2, AlertCircle,
  User, Phone, Brush, Palette, Droplets, Check, Wallet, TrendingUp
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, query, orderBy, setDoc 
} from "firebase/firestore";
import { Appointment, Service, AppointmentStatus } from './types';

// ATENÇÃO: Preencha com suas credenciais do Firebase Console
const firebaseConfig = {
  apiKey: "SUA_API_KEY_AQUI",
  authDomain: "SEU_PROJECT_ID.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_PROJECT_ID.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};

// Inicialização segura do Firebase (Mantenha o mock se as chaves não estiverem preenchidas)
let db: any;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase não inicializado. Verifique as credenciais no App.tsx");
}

const DEFAULT_SLOTS = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30', '18:00'];

// --- UI Components ---

const Logo: React.FC<{ small?: boolean }> = ({ small }) => (
  <div className="flex flex-col items-center select-none pointer-events-none">
    <div className={`logo-container ${small ? 'scale-75' : 'mb-1'}`}>
      <span className="logo-l font-bold">L</span>
      <span className="logo-g font-bold">G</span>
    </div>
    <span className={`${small ? 'text-[7px]' : 'text-[9px]'} tracking-[0.4em] uppercase font-bold text-zinc-400`}>Nails Studio</span>
  </div>
);

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'warning'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const config = {
    success: { bg: 'bg-zinc-900', border: 'border-[#E0BFB8]', text: 'text-white', icon: <CheckCircle className="w-5 h-5 text-[#E0BFB8]" /> },
    error: { bg: 'bg-white', border: 'border-red-400', text: 'text-zinc-900', icon: <XCircle className="w-5 h-5 text-red-400" /> },
    warning: { bg: 'bg-white', border: 'border-amber-400', text: 'text-zinc-900', icon: <AlertCircle className="w-5 h-5 text-amber-400" /> }
  };

  return (
    <div className={`fixed top-6 left-1/2 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-6 z-[200] flex items-center p-4 rounded-2xl shadow-2xl border-l-4 ${config[type].bg} ${config[type].border} ${config[type].text} animate-slide-up w-[90%] md:w-auto`}>
      <div className="mr-3">{config[type].icon}</div>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
};

// --- App Principal ---

export default function App() {
  const [view, setView] = useState<'client' | 'admin'>('client');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminTab, setAdminTab] = useState<'agenda' | 'config'>('agenda');

  // Firestore Data States
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [customSlots, setCustomSlots] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Client Selection States
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sincronização em tempo real (Firestore)
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    const unsubAppts = onSnapshot(collection(db, "appointments"), (snap) => {
      setAppointments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment)));
    });

    const unsubServices = onSnapshot(collection(db, "services"), (snap) => {
      setServices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service)));
    });

    const unsubConfig = onSnapshot(collection(db, "config"), (snap) => {
      snap.docs.forEach(doc => {
        if (doc.id === "blocked_dates") setBlockedDates(doc.data().values || []);
        if (doc.id === "blocked_slots") setBlockedSlots(doc.data().values || []);
        if (doc.id === "custom_slots") setCustomSlots(doc.data().values || []);
      });
    });

    setTimeout(() => setLoading(false), 800);
    return () => { unsubAppts(); unsubServices(); unsubConfig(); };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => setToast({ message, type });

  // Cálculos
  const bookingTotals = useMemo(() => ({
    price: selectedServices.reduce((acc, s) => acc + s.price, 0),
    duration: `${selectedServices.reduce((acc, s) => acc + parseInt(s.duration), 0)} min`
  }), [selectedServices]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || blockedDates.includes(selectedDate)) return [];
    const all = Array.from(new Set([...DEFAULT_SLOTS, ...customSlots])).sort();
    return all.filter(s => !blockedSlots.includes(s)).map(time => ({
      time,
      isTaken: appointments.some(a => a.date === selectedDate && a.time === time && a.status !== 'pending' && a.status !== 'confirmed' ? false : a.date === selectedDate && a.time === time)
    }));
  }, [selectedDate, blockedDates, blockedSlots, customSlots, appointments]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const confirmedToday = appointments.filter(a => a.date === today && a.status === 'confirmed');
    return {
      revenue: confirmedToday.reduce((acc, a) => acc + a.totalPrice, 0),
      count: confirmedToday.length,
      pending: appointments.filter(a => a.status === 'pending').length
    };
  }, [appointments]);

  // Handlers Firestore
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) { showToast("Firebase não configurado", "error"); return; }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "appointments"), {
        clientName, phone: clientPhone,
        services: selectedServices.map(s => s.name),
        totalPrice: bookingTotals.price,
        totalDuration: bookingTotals.duration,
        date: selectedDate, time: selectedTime,
        status: 'pending'
      });
      showToast('Solicitação enviada! Aguarde retorno.');
      setSelectedServices([]); setSelectedDate(''); setSelectedTime(''); setClientName(''); setClientPhone('');
      window.scrollTo(0, 0);
    } finally { setIsSubmitting(false); }
  };

  const updateStatus = async (id: string, status: 'confirmed' | 'delete', apt: Appointment) => {
    if (!db) return;
    if (status === 'confirmed') {
      await updateDoc(doc(db, "appointments", id), { status: 'confirmed' });
      const text = `Olá ${apt.clientName}! Confirmado para ${apt.services.join(' + ')} no dia ${apt.date} às ${apt.time}. ✨`;
      window.open(`https://wa.me/${apt.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
      showToast('Horário confirmado!');
    } else {
      await deleteDoc(doc(db, "appointments", id));
      const text = `Olá ${apt.clientName}, sinto muito, mas precisei recusar/cancelar seu horário no dia ${apt.date}.`;
      window.open(`https://wa.me/${apt.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
      showToast('Agendamento removido.', 'warning');
    }
  };

  const toggleConfig = async (collectionId: string, value: string, current: string[]) => {
    if (!db) return;
    const newList = current.includes(value) ? current.filter(x => x !== value) : [...current, value];
    await setDoc(doc(db, "config", collectionId), { values: newList });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F6]">
      <Logo /><Loader2 className="w-8 h-8 mt-8 animate-spin text-[#E0BFB8] opacity-30" />
    </div>
  );

  return (
    <div className="antialiased">
      {view === 'client' ? (
        <div className="min-h-screen pb-20">
          <header className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#F4E4E1]">
            <Logo small />
            <button onClick={() => setView('admin')} className="px-6 py-2 bg-zinc-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2">
              <User className="w-3 h-3" /> LOGIN ADMIN
            </button>
          </header>

          <section className="relative h-[60vh] flex items-center justify-center text-center px-6 bg-[#1a1a1a]">
            <div className="absolute inset-0 opacity-40 grayscale bg-[url('https://images.unsplash.com/photo-1632345031435-81979cd75139?q=80&w=2000')] bg-cover bg-center"></div>
            <div className="relative z-10 animate-slide-up">
              <h1 className="text-4xl md:text-6xl font-bold text-white serif mb-6">Sua beleza é nossa arte.</h1>
              <button onClick={() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' })} className="px-10 py-4 bg-[#E0BFB8] text-zinc-900 rounded-full font-bold uppercase tracking-widest text-[10px]">Agendar Experiência</button>
            </div>
          </section>

          <section id="servicos" className="py-20 px-6 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold serif text-center mb-12">Nossos Serviços</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map(s => {
                const isS = selectedServices.some(i => i.id === s.id);
                const Icon = (LucideIcons as any)[s.icon] || Sparkles;
                return (
                  <div key={s.id} onClick={() => setSelectedServices(p => isS ? p.filter(x => x.id !== s.id) : [...p, s])}
                    className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative ${isS ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-[#F4E4E1] bg-white'}`}>
                    <Icon className="w-6 h-6 text-[#E0BFB8] mb-4" />
                    <h3 className="font-bold">{s.name}</h3>
                    <p className="text-zinc-400 text-[10px] mb-2">{s.duration}</p>
                    <div className="font-bold">R$ {s.price}</div>
                    {isS && <div className="absolute top-4 right-6 bg-[#E0BFB8] p-1 rounded-full"><Check className="w-3 h-3 text-zinc-900" /></div>}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="py-20 px-6 bg-[#F4E4E1]/20">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleBooking} className="bg-white p-10 rounded-[3rem] border border-[#F4E4E1] space-y-10 animate-slide-up">
                <div className="text-center">
                  <h2 className="text-2xl font-bold serif mb-2">Reserva Online</h2>
                  {selectedServices.length > 0 && <p className="text-[#E0BFB8] text-[10px] font-bold uppercase">R$ {bookingTotals.price} • {bookingTotals.duration}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Data</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} required value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                      className="w-full p-4 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Horário</label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map(s => (
                        <button key={s.time} type="button" disabled={s.isTaken} onClick={() => setSelectedTime(s.time)}
                          className={`py-3 rounded-xl text-[10px] font-bold ${s.isTaken ? 'bg-zinc-50 text-zinc-200 line-through' : selectedTime === s.time ? 'bg-zinc-900 text-white' : 'bg-[#FAF7F6] hover:bg-[#E0BFB8]'}`}>
                          {s.time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input type="text" placeholder="Seu Nome" required value={clientName} onChange={e => setClientName(e.target.value)}
                    className="w-full p-4 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                  <input type="tel" placeholder="WhatsApp" required value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    className="w-full p-4 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                </div>

                <button type="submit" disabled={isSubmitting || !selectedTime || !selectedServices.length}
                  className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all">
                  Confirmar Agendamento
                </button>
              </form>
            </div>
          </section>
        </div>
      ) : (
        <div className="min-h-screen bg-[#FAF7F6] flex flex-col lg:flex-row">
          {!isAdminLoggedIn ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-sm border border-[#F4E4E1]">
                <h2 className="text-2xl font-bold text-center mb-8 serif">Painel Admin</h2>
                <input type="password" placeholder="Senha" onChange={(e) => { if(e.target.value === '1234') setIsAdminLoggedIn(true); }}
                  className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl text-center font-bold tracking-widest mb-6" />
                <button onClick={() => setView('client')} className="w-full text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Sair</button>
              </div>
            </div>
          ) : (
            <>
              <aside className="w-full lg:w-80 bg-white border-r border-[#F4E4E1] p-8 flex flex-col h-screen sticky top-0">
                <Logo small />
                <nav className="mt-12 space-y-4 flex-grow">
                  <button onClick={() => setAdminTab('agenda')} className={`w-full flex items-center p-5 rounded-2xl font-bold text-[10px] uppercase transition-all ${adminTab === 'agenda' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-[#FAF7F6]'}`}>
                    <LayoutDashboard className="w-4 h-4 mr-3" /> Agenda
                  </button>
                  <button onClick={() => setAdminTab('config')} className={`w-full flex items-center p-5 rounded-2xl font-bold text-[10px] uppercase transition-all ${adminTab === 'config' ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-[#FAF7F6]'}`}>
                    <Settings className="w-4 h-4 mr-3" /> Ajustes
                  </button>
                </nav>
                <button onClick={() => setIsAdminLoggedIn(false)} className="w-full p-5 text-red-400 text-[10px] font-bold uppercase"><LogOut className="w-4 h-4 mr-3 inline" /> Logout</button>
              </aside>

              <main className="flex-grow p-10">
                {adminTab === 'agenda' ? (
                  <div className="max-w-5xl mx-auto space-y-12 animate-slide-up">
                    <div className="flex justify-between items-end">
                      <h1 className="text-3xl font-bold serif">Gerenciamento</h1>
                      <div className="flex gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-[#F4E4E1] text-center min-w-[120px]">
                          <span className="text-[8px] font-bold text-[#E0BFB8] block mb-1">RECEITA</span>
                          <span className="text-xl font-bold">R$ {stats.revenue}</span>
                        </div>
                        <div className="bg-zinc-900 p-4 rounded-2xl text-white text-center min-w-[120px]">
                          <span className="text-[8px] font-bold text-zinc-500 block mb-1">PEDIDOS</span>
                          <span className="text-xl font-bold text-[#E0BFB8]">{stats.pending}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-xl font-bold serif">Pendentes</h2>
                      {appointments.filter(a => a.status === 'pending').map((a) => (
                        <div key={a.id} className="bg-white p-6 rounded-3xl border border-[#F4E4E1] flex items-center justify-between shadow-sm">
                          <div>
                            <span className="font-bold text-lg">{a.clientName}</span>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase">{a.date} às {a.time} • R$ {a.totalPrice}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => updateStatus(a.id!, 'confirmed', a)} className="p-3 bg-[#E0BFB8] rounded-xl text-zinc-900 font-bold text-[9px] uppercase">Aprovar</button>
                            <button onClick={() => updateStatus(a.id!, 'delete', a)} className="p-3 bg-red-50 text-red-400 rounded-xl font-bold text-[9px] uppercase">Recusar</button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <h2 className="text-xl font-bold serif text-green-600">Confirmados</h2>
                      {appointments.filter(a => a.status === 'confirmed').map((a) => (
                        <div key={a.id} className="bg-zinc-900 p-6 rounded-3xl flex items-center justify-between text-white">
                          <div>
                            <span className="font-bold">{a.clientName}</span>
                            <p className="text-[10px] text-zinc-500 uppercase">{a.time} • {a.services.join(' + ')}</p>
                          </div>
                          <button onClick={() => updateStatus(a.id!, 'delete', a)} className="text-red-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="max-w-5xl mx-auto space-y-12 animate-slide-up">
                    <h1 className="text-3xl font-bold serif">Configurações</h1>
                    
                    <section className="bg-white p-8 rounded-[2rem] border border-[#F4E4E1] space-y-6">
                      <h2 className="text-xl font-bold serif">Grade de Horários</h2>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {DEFAULT_SLOTS.map(t => {
                          const isB = blockedSlots.includes(t);
                          return (
                            <button key={t} onClick={() => toggleConfig('blocked_slots', t, blockedSlots)}
                              className={`py-3 rounded-xl text-[10px] font-bold border ${isB ? 'bg-red-50 border-red-100 text-red-400' : 'bg-white border-[#F4E4E1]'}`}>{t}</button>
                          );
                        })}
                      </div>
                    </section>

                    <section className="bg-white p-8 rounded-[2rem] border border-[#F4E4E1] space-y-4">
                      <h2 className="text-xl font-bold serif">Bloquear Dias (Folgas)</h2>
                      <input type="date" onChange={(e) => toggleConfig('blocked_dates', e.target.value, blockedDates)} className="p-4 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl w-full max-w-xs" />
                      <div className="flex flex-wrap gap-2">
                        {blockedDates.map(d => (
                          <span key={d} className="px-4 py-2 bg-zinc-900 text-white rounded-full text-[10px] font-bold">{d} <XCircle onClick={() => toggleConfig('blocked_dates', d, blockedDates)} className="w-3 h-3 inline cursor-pointer ml-1" /></span>
                        ))}
                      </div>
                    </section>
                  </div>
                )}
              </main>
            </>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
