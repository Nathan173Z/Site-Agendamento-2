
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Plus, 
  LogOut, 
  Settings, 
  LayoutDashboard, 
  Instagram, 
  MapPin, 
  Sparkles, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  RefreshCcw,
  User,
  Phone,
  Brush,
  Palette,
  Droplets,
  Check,
  Wallet,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Appointment, Service, AppointmentStatus } from './types';

// Mock de Serviços Iniciais
const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'Alongamento de Fibra', price: 220, duration: '150 min', icon: 'Sparkles' },
  { id: '2', name: 'Banho de Gel', price: 120, duration: '90 min', icon: 'Droplets' },
  { id: '3', name: 'Manicure Russa', price: 80, duration: '60 min', icon: 'Brush' },
  { id: '4', name: 'Nail Art Avançada', price: 150, duration: '120 min', icon: 'Palette' },
];

const DEFAULT_SLOTS = ['08:00', '09:30', '11:00', '13:30', '15:00', '16:30', '18:00'];

// --- Componentes de UI Internos ---

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

const Modal: React.FC<{ isOpen: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void }> = ({ 
  isOpen, title, message, onConfirm, onCancel 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[190] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm px-4">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full animate-slide-up border border-zinc-100">
        <h3 className="text-xl font-bold mb-3 text-zinc-900 serif text-center">{title}</h3>
        <p className="text-zinc-500 text-sm mb-10 leading-relaxed text-center">{message}</p>
        <div className="flex space-x-3">
          <button onClick={onCancel} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors">Voltar</button>
          <button onClick={onConfirm} className="flex-1 py-4 text-xs font-bold uppercase tracking-widest bg-zinc-900 text-white rounded-2xl hover:bg-zinc-800 transition-all">Confirmar</button>
        </div>
      </div>
    </div>
  );
};

// --- Aplicação Principal ---

export default function App() {
  const [view, setView] = useState<'client' | 'admin'>('client');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminTab, setAdminTab] = useState<'agenda' | 'config'>('agenda');

  // Estados de Dados
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [customSlots, setCustomSlots] = useState<string[]>([]);
  
  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [modal, setModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Estados Form Cliente
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1200);
    window.scrollTo(0, 0);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  };

  // Cálculos de Agendamento
  const bookingTotals = useMemo(() => ({
    price: selectedServices.reduce((acc, s) => acc + s.price, 0),
    duration: `${selectedServices.reduce((acc, s) => acc + parseInt(s.duration), 0)} min`
  }), [selectedServices]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || blockedDates.includes(selectedDate)) return [];
    const all = Array.from(new Set([...DEFAULT_SLOTS, ...customSlots])).sort();
    return all.filter(s => !blockedSlots.includes(s)).map(time => ({
      time,
      isTaken: appointments.some(a => a.date === selectedDate && a.time === time && (a.status === 'confirmed' || a.status === 'pending'))
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

  // Handlers
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newApt: Appointment = {
        clientName,
        phone: clientPhone,
        services: selectedServices.map(s => s.name),
        totalPrice: bookingTotals.price,
        totalDuration: bookingTotals.duration,
        date: selectedDate,
        time: selectedTime,
        status: 'pending'
      };
      setAppointments(prev => [...prev, newApt]);
      showToast('Solicitação enviada com sucesso!');
      setSelectedServices([]); setSelectedDate(''); setSelectedTime(''); setClientName(''); setClientPhone('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveApt = (apt: Appointment) => {
    setAppointments(prev => prev.map(a => a === apt ? { ...a, status: 'confirmed' } : a));
    const text = `Olá ${apt.clientName}! Seu horário para ${apt.services.join(' + ')} no dia ${apt.date} às ${apt.time} está CONFIRMADO! 💅`;
    window.open(`https://wa.me/${apt.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('Confirmado!');
  };

  const refuseApt = (apt: Appointment) => {
    setAppointments(prev => prev.filter(a => a !== apt));
    const text = `Olá ${apt.clientName}, sinto muito, mas não poderei atender no horário solicitado. Vamos marcar outra data?`;
    window.open(`https://wa.me/${apt.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('Recusado.', 'warning');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F6]">
      <Logo />
      <Loader2 className="w-8 h-8 mt-8 animate-spin text-[#E0BFB8] opacity-30" />
    </div>
  );

  // --- Login Screen ---
  if (view === 'admin' && !isAdminLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F6]">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-sm border border-[#F4E4E1] animate-slide-up">
          <div className="flex justify-center mb-10"><Logo /></div>
          <h2 className="text-2xl font-bold text-center mb-8 serif">Admin Access</h2>
          <div className="space-y-6">
            <input 
              type="password" placeholder="Senha" 
              onChange={(e) => { if(e.target.value === '1234') setIsAdminLoggedIn(true); }}
              className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl text-center font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-[#E0BFB8]"
            />
            <p className="text-center text-[10px] text-zinc-400 uppercase tracking-widest">Digite 1234 para testar</p>
            <button onClick={() => setView('client')} className="w-full text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Voltar ao Site</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="antialiased">
      {view === 'client' ? (
        <div className="min-h-screen">
          <header className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#F4E4E1]">
            <Logo small />
            <button onClick={() => setView('admin')} className="px-6 py-2 bg-zinc-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2">
              <User className="w-3 h-3" /> Area Profissional
            </button>
          </header>

          {/* Hero */}
          <section className="relative h-[80vh] flex items-center justify-center text-center px-6 bg-[#1a1a1a]">
            <div className="absolute inset-0 opacity-40 grayscale bg-[url('https://images.unsplash.com/photo-1632345031435-81979cd75139?q=80&w=2000')] bg-cover bg-center"></div>
            <div className="relative z-10 max-w-2xl animate-slide-up">
              <h1 className="text-5xl md:text-7xl font-bold text-white serif mb-8 leading-tight">Elevando sua beleza ao patamar de arte.</h1>
              <p className="text-zinc-300 text-lg font-light mb-12">Agende sua experiência exclusiva em nosso estúdio premium.</p>
              <button onClick={() => document.getElementById('reserva')?.scrollIntoView({ behavior: 'smooth' })} className="px-12 py-5 bg-[#E0BFB8] text-zinc-900 rounded-full font-bold uppercase tracking-widest text-[10px] shadow-2xl">
                Ver Agenda
              </button>
            </div>
          </section>

          {/* Services */}
          <section className="py-24 px-6 max-w-6xl mx-auto">
            <h2 className="text-4xl font-bold serif text-center mb-16">Procedimentos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map(s => {
                const isSelected = selectedServices.some(i => i.id === s.id);
                const Icon = (LucideIcons as any)[s.icon] || Sparkles;
                return (
                  <div key={s.id} onClick={() => setSelectedServices(p => isSelected ? p.filter(x => x.id !== s.id) : [...p, s])}
                    className={`p-8 rounded-[2.5rem] border transition-all cursor-pointer relative ${isSelected ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-[#F4E4E1] bg-white'}`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${isSelected ? 'bg-zinc-800 text-[#E0BFB8]' : 'bg-[#FAF7F6] text-[#E0BFB8]'}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-xl mb-1">{s.name}</h3>
                    <p className="text-zinc-400 text-xs mb-4">{s.duration}</p>
                    <div className="font-bold text-lg">R$ {s.price}</div>
                    {isSelected && <div className="absolute top-4 right-6 bg-[#E0BFB8] p-1 rounded-full"><Check className="w-3 h-3 text-zinc-900" /></div>}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Booking Form */}
          <section id="reserva" className="py-24 px-6 bg-[#F4E4E1]/30">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleBooking} className="bg-white p-10 md:p-20 rounded-[4rem] shadow-sm border border-[#F4E4E1] animate-slide-up space-y-12">
                <div className="text-center">
                  <h2 className="text-3xl font-bold serif mb-2">Configure sua Visita</h2>
                  {selectedServices.length > 0 && <p className="text-[#E0BFB8] text-[10px] font-bold uppercase tracking-widest">Total: R$ {bookingTotals.price} • {bookingTotals.duration}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Escolha a Data</label>
                    <input type="date" min={new Date().toISOString().split('T')[0]} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                      className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Horário Disponível</label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map(s => (
                        <button key={s.time} type="button" disabled={s.isTaken} onClick={() => setSelectedTime(s.time)}
                          className={`py-3 rounded-xl text-xs font-bold transition-all ${s.isTaken ? 'bg-zinc-50 text-zinc-200 line-through' : selectedTime === s.time ? 'bg-zinc-900 text-white' : 'bg-[#FAF7F6] hover:bg-[#E0BFB8]'}`}>
                          {s.time}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <input type="text" placeholder="Nome Completo" required value={clientName} onChange={e => setClientName(e.target.value)}
                    className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                  <input type="tel" placeholder="WhatsApp (DDD)" required value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                    className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                </div>

                <button type="submit" disabled={isSubmitting || !selectedTime || !selectedServices.length}
                  className="w-full py-6 bg-zinc-900 text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl hover:bg-zinc-800 transition-all">
                  {isSubmitting ? 'Agendando...' : 'Solicitar Horário Premium'}
                </button>
              </form>
            </div>
          </section>

          <footer className="py-20 text-center border-t border-[#F4E4E1]">
             <Logo />
             <p className="mt-8 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.4em]">© 2024 LG NAILS STUDIO | LUXURY SERVICE</p>
          </footer>
        </div>
      ) : (
        <div className="min-h-screen bg-[#FAF7F6] flex flex-col lg:flex-row">
          {/* Admin Sidebar */}
          <aside className="w-full lg:w-80 bg-white border-r border-[#F4E4E1] p-8 flex flex-col h-screen sticky top-0">
            <div className="mb-12"><Logo /></div>
            <nav className="space-y-4 flex-grow">
              <button onClick={() => setAdminTab('agenda')} className={`w-full flex items-center p-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${adminTab === 'agenda' ? 'bg-zinc-900 text-white shadow-2xl' : 'text-zinc-400 hover:bg-[#FAF7F6]'}`}>
                <LayoutDashboard className="w-4 h-4 mr-3" /> Agenda do Dia
              </button>
              <button onClick={() => setAdminTab('config')} className={`w-full flex items-center p-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${adminTab === 'config' ? 'bg-zinc-900 text-white shadow-2xl' : 'text-zinc-400 hover:bg-[#FAF7F6]'}`}>
                <Settings className="w-4 h-4 mr-3" /> Configurações
              </button>
            </nav>
            <div className="mt-auto space-y-4">
              <button onClick={() => setView('client')} className="w-full flex items-center p-5 text-zinc-400 text-[10px] font-bold uppercase tracking-widest"><LogOut className="w-4 h-4 mr-3" /> Sair</button>
            </div>
          </aside>

          {/* Admin Main Content */}
          <main className="flex-grow p-6 lg:p-12">
            {adminTab === 'agenda' ? (
              <div className="max-w-5xl mx-auto space-y-12 animate-slide-up">
                <div className="flex flex-col md:flex-row justify-between gap-6 items-start md:items-end">
                  <div><h1 className="text-4xl font-bold serif">Painel de Controle</h1><p className="text-zinc-400 font-medium">Gestão em tempo real.</p></div>
                  <div className="flex gap-4">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-[#F4E4E1]"><span className="text-[9px] font-bold text-[#E0BFB8] block mb-1">RECEITA HOJE</span><span className="text-2xl font-bold">R$ {stats.revenue}</span></div>
                    <div className="bg-zinc-900 p-6 rounded-[2.5rem] text-white"><span className="text-[9px] font-bold text-zinc-500 block mb-1">PENDENTES</span><span className="text-2xl font-bold text-[#E0BFB8]">{stats.pending}</span></div>
                  </div>
                </div>

                {/* Pendentes */}
                <section className="space-y-6">
                  <h2 className="text-xl font-bold serif">Solicitações Recentes</h2>
                  {appointments.filter(a => a.status === 'pending').map((a, i) => (
                    <div key={i} className="bg-white p-8 rounded-[3rem] border border-[#F4E4E1] flex flex-col md:flex-row gap-8 items-center shadow-sm">
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-2"><span className="text-xl font-bold">{a.clientName}</span><span className="px-2 py-1 bg-amber-50 text-amber-600 text-[8px] font-bold rounded uppercase">Aguardando</span></div>
                        <div className="flex flex-wrap gap-2 text-[10px] font-bold text-zinc-400 uppercase">
                          <span>{a.date}</span><span>•</span><span>{a.time}</span><span>•</span><span>R$ {a.totalPrice}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveApt(a)} className="p-4 bg-[#E0BFB8] text-zinc-900 rounded-2xl font-bold text-[9px] uppercase tracking-widest">Aprovar</button>
                        <button onClick={() => refuseApt(a)} className="p-4 bg-white border border-red-100 text-red-400 rounded-2xl font-bold text-[9px] uppercase tracking-widest">Recusar</button>
                      </div>
                    </div>
                  ))}
                </section>

                {/* Agenda Confirmada */}
                <section className="space-y-6">
                  <h2 className="text-xl font-bold serif">Próximos Atendimentos</h2>
                  {appointments.filter(a => a.status === 'confirmed').sort((a,b) => a.time.localeCompare(b.time)).map((a, i) => (
                    <div key={i} className="bg-zinc-900 p-8 rounded-[3rem] flex items-center justify-between shadow-xl">
                      <div className="text-white">
                        <span className="text-lg font-bold block">{a.clientName}</span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">{a.time} • {a.services.join(' + ')}</span>
                      </div>
                      <button onClick={() => setAppointments(p => p.filter(x => x !== a))} className="w-12 h-12 bg-zinc-800 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </section>
              </div>
            ) : (
              <div className="max-w-5xl mx-auto space-y-12 animate-slide-up">
                <h1 className="text-4xl font-bold serif">Ajustes Globais</h1>
                
                {/* CRUD Serviços Simplificado */}
                <section className="bg-white p-10 rounded-[3rem] border border-[#F4E4E1] space-y-8">
                  <h2 className="text-xl font-bold serif">Gestão de Cardápio</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {services.map(s => (
                      <div key={s.id} className="p-6 bg-[#FAF7F6] rounded-2xl border border-[#F4E4E1] flex items-center justify-between">
                        <div><span className="font-bold block">{s.name}</span><span className="text-[10px] text-zinc-400 font-bold uppercase">R$ {s.price} • {s.duration}</span></div>
                        <button onClick={() => setServices(p => p.filter(x => x.id !== s.id))} className="text-red-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                    <button onClick={() => setServices(INITIAL_SERVICES)} className="sm:col-span-2 p-5 border border-dashed border-[#F4E4E1] rounded-2xl text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Restaurar Serviços Padrão</button>
                  </div>
                </section>

                {/* Bloqueio Rápido de Horários */}
                <section className="bg-white p-10 rounded-[3rem] border border-[#F4E4E1] space-y-8">
                  <h2 className="text-xl font-bold serif">Grade de Horários Padrão</h2>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {DEFAULT_SLOTS.map(t => {
                      const isB = blockedSlots.includes(t);
                      return (
                        <button key={t} onClick={() => setBlockedSlots(p => isB ? p.filter(x => x !== t) : [...p, t])}
                          className={`py-4 rounded-xl text-[10px] font-bold border transition-all ${isB ? 'bg-red-50 border-red-100 text-red-400' : 'bg-white border-[#F4E4E1]'}`}>
                          {t}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-zinc-400 italic font-medium">* Clique para bloquear o horário globalmente.</p>
                </section>
              </div>
            )}
          </main>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {modal && <Modal isOpen title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={() => setModal(null)} />}
    </div>
  );
}
