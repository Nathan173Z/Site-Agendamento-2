
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

// Initial Mock Data
const INITIAL_SERVICES: Service[] = [
  { id: '1', name: 'Alongamento de Fibra', price: 220, duration: '150 min', icon: 'Sparkles' },
  { id: '2', name: 'Banho de Gel', price: 120, duration: '90 min', icon: 'Droplets' },
  { id: '3', name: 'Manicure Russa', price: 80, duration: '60 min', icon: 'Brush' },
  { id: '4', name: 'Nail Art Avançada', price: 150, duration: '120 min', icon: 'Palette' },
];

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

// --- Main App ---

export default function App() {
  // Navigation & Auth
  const [view, setView] = useState<'client' | 'admin'>('client');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminTab, setAdminTab] = useState<'agenda' | 'config'>('agenda');

  // Core Data State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<string[]>([]);
  const [customSlots, setCustomSlots] = useState<string[]>([]);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [modal, setModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Client Flow State
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  // Admin Multi-selection
  const [bulkServiceSelection, setBulkServiceSelection] = useState<string[]>([]);

  useEffect(() => {
    // Simulate data fetch
    setTimeout(() => setLoading(false), 1200);
    window.scrollTo(0, 0);
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
  }, []);

  // --- Calculations ---

  const bookingTotals = useMemo(() => {
    const price = selectedServices.reduce((acc, s) => acc + s.price, 0);
    const min = selectedServices.reduce((acc, s) => acc + parseInt(s.duration), 0);
    return { price, duration: `${min} min` };
  }, [selectedServices]);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const confirmedToday = appointments.filter(a => a.date === today && a.status === 'confirmed');
    return {
      revenue: confirmedToday.reduce((acc, a) => acc + a.totalPrice, 0),
      count: confirmedToday.length,
      pending: appointments.filter(a => a.status === 'pending').length
    };
  }, [appointments]);

  const availableSlots = useMemo(() => {
    if (!selectedDate || blockedDates.includes(selectedDate)) return [];
    const all = Array.from(new Set([...DEFAULT_SLOTS, ...customSlots])).sort();
    return all.filter(s => !blockedSlots.includes(s)).map(time => ({
      time,
      isTaken: appointments.some(a => a.date === selectedDate && a.time === time && (a.status === 'confirmed' || a.status === 'pending'))
    }));
  }, [selectedDate, blockedDates, blockedSlots, customSlots, appointments]);

  // --- Handlers ---

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServices.length || !selectedDate || !selectedTime || !clientName) {
      showToast('Preencha todos os campos obrigatórios', 'error');
      return;
    }
    setIsBookingSubmitting(true);
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
      showToast('Pedido enviado! Fique atenta ao WhatsApp.');
      // Reset
      setSelectedServices([]); setSelectedDate(''); setSelectedTime(''); setClientName(''); setClientPhone('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsBookingSubmitting(false);
    }
  };

  const approveApt = (apt: Appointment) => {
    setAppointments(prev => prev.map(a => a === apt ? { ...a, status: 'confirmed' } : a));
    const text = `Olá ${apt.clientName}! Seu horário para ${apt.services.join(' e ')} no dia ${apt.date} às ${apt.time} foi CONFIRMADO. ✨ Mal posso esperar!`;
    window.open(`https://wa.me/${apt.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('Agendamento confirmado!');
  };

  const refuseApt = (apt: Appointment) => {
    setAppointments(prev => prev.filter(a => a !== apt));
    const text = `Olá ${apt.clientName}, sinto muito mas não tenho disponibilidade para ${apt.time} no dia ${apt.date}. Vamos escolher outro momento?`;
    window.open(`https://wa.me/${apt.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    showToast('Recusado e cliente notificada.', 'warning');
  };

  const cancelConfirmed = (apt: Appointment) => {
    setModal({
      title: 'Cancelar Atendimento',
      message: `Deseja realmente cancelar o horário de ${apt.clientName}? Isso liberará o slot imediatamente.`,
      onConfirm: () => {
        setAppointments(prev => prev.filter(a => a !== apt));
        const text = `Olá ${apt.clientName}, precisei cancelar seu horário do dia ${apt.date}. Entre em contato para reagendarmos.`;
        window.open(`https://wa.me/${apt.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
        setModal(null);
        showToast('Cancelado.', 'error');
      }
    });
  };

  // --- Sub-Views ---

  const ClientHeader = () => (
    <header className="flex items-center justify-between p-6 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-[#F4E4E1]">
      <Logo small />
      <button 
        onClick={() => setView('admin')}
        className="px-6 py-2.5 bg-zinc-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2"
      >
        <User className="w-3 h-3" /> Painel Admin
      </button>
    </header>
  );

  const AdminHeader = () => (
    <header className="flex items-center justify-between p-6 bg-white border-b border-[#F4E4E1] lg:hidden">
      <Logo small />
      <button onClick={() => setView('client')} className="p-2 text-zinc-400"><LogOut className="w-5 h-5" /></button>
    </header>
  );

  const AdminLogin = () => {
    const [pwd, setPwd] = useState('');
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#FAF7F6]">
        <div className="w-full max-w-sm bg-white p-10 rounded-[3rem] shadow-sm border border-[#F4E4E1] animate-slide-up">
          <div className="flex justify-center mb-10"><Logo /></div>
          <h2 className="text-2xl font-bold text-center mb-8 serif">Login Administrativo</h2>
          <div className="space-y-6">
            <input 
              type="password" placeholder="Sua Senha"
              value={pwd} onChange={e => setPwd(e.target.value)}
              className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl text-center font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-[#E0BFB8]"
            />
            <button 
              onClick={() => pwd === '1234' ? setIsAdminLoggedIn(true) : showToast('Senha inválida', 'error')}
              className="w-full py-5 bg-zinc-900 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest hover:bg-zinc-800 transition-all shadow-xl shadow-zinc-200"
            >
              Acessar Agenda
            </button>
            <button onClick={() => setView('client')} className="w-full text-zinc-400 text-[10px] font-bold uppercase tracking-widest">Voltar para Site</button>
          </div>
        </div>
      </div>
    );
  };

  // --- Main Render Logic ---

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF7F6]">
      <Logo />
      <Loader2 className="w-8 h-8 mt-8 animate-spin text-[#E0BFB8] opacity-30" />
    </div>
  );

  if (view === 'admin' && !isAdminLoggedIn) return <AdminLogin />;

  return (
    <div className="antialiased text-zinc-900">
      {view === 'client' ? (
        <div className="min-h-screen pb-20">
          <ClientHeader />
          
          {/* Hero */}
          <section className="relative py-24 px-6 text-center bg-[#1a1a1a] overflow-hidden">
             <div className="absolute inset-0 opacity-40 grayscale pointer-events-none bg-[url('https://images.unsplash.com/photo-1632345031435-81979cd75139?q=80&w=2000')] bg-cover bg-center"></div>
             <div className="relative z-10 max-w-3xl mx-auto animate-slide-up">
               <span className="inline-block px-4 py-1.5 bg-white/10 text-white rounded-full text-[9px] font-bold uppercase tracking-widest mb-6">Procedimentos de Luxo</span>
               <h1 className="text-5xl md:text-7xl font-bold text-white serif mb-8 leading-tight">Suas unhas são seu maior acessório.</h1>
               <p className="text-zinc-300 text-lg font-light leading-relaxed mb-12 max-w-md mx-auto">Excelência técnica e estética refinada para mulheres que não abrem mão do cuidado premium.</p>
               <button 
                onClick={() => document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-12 py-5 bg-[#E0BFB8] text-zinc-900 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-[#F4E4E1] transition-all shadow-2xl shadow-black/50"
               >
                 Reserve sua Experiência
               </button>
             </div>
          </section>

          {/* Services Multi-selection */}
          <section id="servicos" className="py-24 px-6 max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold serif mb-3">Cardápio de Serviços</h2>
              <p className="text-zinc-400 text-sm font-medium">Selecione um ou mais procedimentos para o seu atendimento.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map(s => {
                const isSelected = selectedServices.some(item => item.id === s.id);
                const Icon = (LucideIcons as any)[s.icon] || Sparkles;
                return (
                  <div 
                    key={s.id} 
                    onClick={() => setSelectedServices(p => isSelected ? p.filter(x => x.id !== s.id) : [...p, s])}
                    className={`group p-8 rounded-[2.5rem] border transition-all cursor-pointer relative ${
                      isSelected ? 'border-zinc-900 bg-zinc-900 text-white shadow-2xl scale-[1.02]' : 'border-[#F4E4E1] bg-white hover:border-[#E0BFB8] hover:shadow-xl'
                    }`}
                  >
                    {isSelected && <div className="absolute top-4 right-6 bg-[#E0BFB8] p-1 rounded-full"><Check className="w-3 h-3 text-zinc-900" /></div>}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${isSelected ? 'bg-zinc-800 text-[#E0BFB8]' : 'bg-[#FAF7F6] text-[#E0BFB8] group-hover:bg-[#E0BFB8] group-hover:text-white'}`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-bold mb-1">{s.name}</h3>
                    <p className={`text-xs mb-6 ${isSelected ? 'text-zinc-400' : 'text-zinc-400'}`}>Duração: {s.duration}</p>
                    <div className="text-lg font-bold">R$ {s.price}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Booking Area */}
          <section id="agendar" className="py-24 px-6 bg-[#F4E4E1]/30 border-y border-[#F4E4E1]">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleBooking} className="bg-white p-10 md:p-20 rounded-[4rem] shadow-sm border border-[#F4E4E1] animate-slide-up">
                <div className="space-y-12">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold serif mb-2">Configure sua Reserva</h2>
                    {selectedServices.length > 0 ? (
                      <p className="text-[#E0BFB8] text-xs font-bold uppercase tracking-widest">{selectedServices.length} serviços selecionados</p>
                    ) : (
                      <p className="text-red-400 text-xs italic">Nenhum serviço selecionado acima.</p>
                    )}
                  </div>

                  {/* Booking Summary Floating Panel */}
                  {selectedServices.length > 0 && (
                    <div className="p-6 bg-[#FAF7F6] border border-[#F4E4E1] rounded-3xl flex flex-wrap gap-8 items-center justify-center text-center">
                      <div><span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Investimento</span><span className="text-2xl font-bold">R$ {bookingTotals.price}</span></div>
                      <div className="w-px h-10 bg-[#F4E4E1]"></div>
                      <div><span className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Tempo no Estúdio</span><span className="text-2xl font-bold text-zinc-500">{bookingTotals.duration}</span></div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1 flex items-center gap-2"><Calendar className="w-3 h-3" /> Data Preferida</label>
                      <input 
                        type="date" 
                        min={new Date().toISOString().split('T')[0]}
                        value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setSelectedTime(''); }}
                        className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl focus:outline-none focus:ring-1 focus:ring-zinc-900" 
                      />
                      {selectedDate && blockedDates.includes(selectedDate) && <p className="text-red-400 text-[10px] font-bold ml-1 uppercase">Indisponível nesta data.</p>}
                    </div>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1 flex items-center gap-2"><Clock className="w-3 h-3" /> Horários Livres</label>
                      <div className="grid grid-cols-3 gap-2">
                        {availableSlots.length === 0 ? <p className="col-span-3 text-zinc-300 text-[10px] italic">Escolha uma data para ver os horários.</p> :
                          availableSlots.map(s => (
                            <button 
                              key={s.time} type="button" disabled={s.isTaken}
                              onClick={() => setSelectedTime(s.time)}
                              className={`py-3 rounded-xl text-xs font-bold transition-all ${
                                s.isTaken ? 'bg-zinc-100 text-zinc-300 line-through' :
                                selectedTime === s.time ? 'bg-zinc-900 text-white shadow-xl scale-105' : 'bg-[#FAF7F6] hover:bg-[#E0BFB8] hover:text-white'
                              }`}
                            >
                              {s.time}
                            </button>
                          ))
                        }
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Seu Nome</label>
                      <input 
                        type="text" required value={clientName} onChange={e => setClientName(e.target.value)}
                        placeholder="Como te chamamos?"
                        className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl focus:outline-none focus:ring-1 focus:ring-zinc-900" 
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">WhatsApp</label>
                      <input 
                        type="tel" required value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl focus:outline-none focus:ring-1 focus:ring-zinc-900" 
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" disabled={isBookingSubmitting || !selectedTime || !selectedServices.length || !clientName}
                    className={`w-full py-6 rounded-3xl font-bold uppercase text-[10px] tracking-widest transition-all shadow-2xl ${
                      isBookingSubmitting ? 'bg-zinc-400 opacity-50' : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {isBookingSubmitting ? 'Processando...' : 'Confirmar Pré-Agendamento Premium'}
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Social Footer */}
          <footer className="py-20 px-6 bg-white border-t border-[#F4E4E1] text-center">
            <div className="max-w-6xl mx-auto">
              <Logo />
              <div className="mt-12 flex justify-center gap-6">
                <a href="#" className="w-14 h-14 bg-[#FAF7F6] rounded-full flex items-center justify-center text-zinc-900 hover:bg-[#E0BFB8] hover:text-white transition-all"><Instagram className="w-6 h-6" /></a>
                <a href="#" className="w-14 h-14 bg-[#FAF7F6] rounded-full flex items-center justify-center text-zinc-900 hover:bg-[#E0BFB8] hover:text-white transition-all"><MapPin className="w-6 h-6" /></a>
              </div>
              <p className="mt-12 text-[9px] font-bold text-zinc-400 uppercase tracking-[0.4em]">© 2024 LG NAILS STUDIO | LUXURY EXPERIENCE</p>
            </div>
          </footer>
        </div>
      ) : (
        <div className="min-h-screen bg-[#FAF7F6] flex flex-col lg:flex-row">
          <AdminHeader />
          
          {/* Sidebar */}
          <aside className="hidden lg:flex w-80 bg-white border-r border-[#F4E4E1] p-8 flex-col sticky top-0 h-screen">
            <div className="mb-12"><Logo /></div>
            <nav className="space-y-4 flex-grow">
              <button 
                onClick={() => setAdminTab('agenda')}
                className={`w-full flex items-center p-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${adminTab === 'agenda' ? 'bg-zinc-900 text-white shadow-2xl' : 'text-zinc-400 hover:bg-[#FAF7F6]'}`}
              >
                <LayoutDashboard className="w-4 h-4 mr-3" /> Gestão de Agenda
              </button>
              <button 
                onClick={() => setAdminTab('config')}
                className={`w-full flex items-center p-5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all ${adminTab === 'config' ? 'bg-zinc-900 text-white shadow-2xl' : 'text-zinc-400 hover:bg-[#FAF7F6]'}`}
              >
                <Settings className="w-4 h-4 mr-3" /> Configurações
              </button>
            </nav>
            <div className="space-y-4">
              <button onClick={() => setView('client')} className="w-full flex items-center p-5 rounded-2xl text-zinc-400 font-bold text-[10px] uppercase tracking-widest hover:bg-[#FAF7F6]"><User className="w-4 h-4 mr-3" /> Ver como Cliente</button>
              <button onClick={() => setIsAdminLoggedIn(false)} className="w-full flex items-center p-5 rounded-2xl text-red-400 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50"><LogOut className="w-4 h-4 mr-3" /> Sair do Painel</button>
            </div>
          </aside>

          {/* Admin Content */}
          <main className="flex-grow p-6 md:p-12 overflow-y-auto">
            {adminTab === 'agenda' ? (
              <div className="max-w-5xl mx-auto space-y-12 animate-slide-up">
                {/* Header Metrics */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                  <div>
                    <h1 className="text-4xl font-bold serif text-zinc-900">Painel de Controle</h1>
                    <p className="text-zinc-400 mt-1 font-medium">Gestão em tempo real do estúdio.</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full md:w-auto">
                    <div className="bg-white p-6 rounded-[2.5rem] border border-[#F4E4E1] shadow-sm flex flex-col">
                      <span className="text-[9px] font-bold text-[#E0BFB8] uppercase tracking-widest mb-1 flex items-center"><Wallet className="w-3 h-3 mr-1" /> Receita Hoje</span>
                      <span className="text-2xl font-bold">R$ {stats.revenue}</span>
                    </div>
                    <div className="bg-white p-6 rounded-[2.5rem] border border-[#F4E4E1] shadow-sm flex flex-col">
                      <span className="text-[9px] font-bold text-[#E0BFB8] uppercase tracking-widest mb-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Atendimentos</span>
                      <span className="text-2xl font-bold">{stats.count}</span>
                    </div>
                    <div className="hidden sm:flex bg-zinc-900 p-6 rounded-[2.5rem] shadow-xl text-white flex-col">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center"><Clock className="w-3 h-3 mr-1" /> Pendentes</span>
                      <span className="text-2xl font-bold text-[#E0BFB8]">{stats.pending}</span>
                    </div>
                  </div>
                </div>

                {/* Pendentes */}
                <section className="space-y-6">
                  <h2 className="text-xl font-bold serif flex items-center"><Clock className="w-5 h-5 mr-3 text-amber-500" /> Novas Solicitações</h2>
                  <div className="space-y-4">
                    {appointments.filter(a => a.status === 'pending').length === 0 ? (
                      <div className="p-16 text-center bg-white rounded-[3rem] border border-dashed border-[#F4E4E1] text-zinc-400 font-medium italic">Tudo limpo! Sem pedidos pendentes.</div>
                    ) : (
                      appointments.filter(a => a.status === 'pending').map((a, i) => (
                        <div key={i} className="bg-white p-8 rounded-[3rem] border border-[#F4E4E1] flex flex-col md:flex-row gap-8 items-center animate-slide-up shadow-sm">
                          <div className="flex-grow w-full">
                            <div className="flex items-center gap-3 mb-4">
                              <span className="text-2xl font-bold text-zinc-900">{a.clientName}</span>
                              <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-bold rounded-full border border-amber-100 uppercase tracking-widest">Pedido Novo</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-6">
                              {a.services.map((s, idx) => (
                                <span key={idx} className="px-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-semibold text-zinc-600">{s}</span>
                              ))}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center"><Calendar className="w-3 h-3 mr-2" /> {a.date}</div>
                              <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center"><Clock className="w-3 h-3 mr-2" /> {a.time}</div>
                              <div className="text-[10px] font-bold uppercase text-zinc-900 flex items-center font-bold tracking-widest"><Sparkles className="w-3 h-3 mr-2 text-[#E0BFB8]" /> R$ {a.totalPrice}</div>
                              <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center"><Phone className="w-3 h-3 mr-2" /> {a.phone}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => approveApt(a)} className="flex-1 md:flex-none p-5 bg-[#E0BFB8] text-zinc-900 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-[#F4E4E1] transition-all flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> Aprovar</button>
                            <button onClick={() => refuseApt(a)} className="flex-1 md:flex-none p-5 bg-white border border-red-100 text-red-400 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2"><XCircle className="w-4 h-4" /> Recusar</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Agenda Diária */}
                <section className="space-y-6">
                  <h2 className="text-xl font-bold serif flex items-center"><CheckCircle className="w-5 h-5 mr-3 text-green-500" /> Agenda de Trabalho</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {appointments.filter(a => a.status === 'confirmed').length === 0 ? (
                      <div className="p-16 text-center bg-zinc-50 rounded-[3rem] border border-[#F4E4E1] text-zinc-300 font-medium italic">Sua agenda confirmada aparecerá aqui.</div>
                    ) : (
                      appointments.filter(a => a.status === 'confirmed').sort((a,b) => a.time.localeCompare(b.time)).map((a, i) => (
                        <div key={i} className="bg-zinc-900 p-8 rounded-[3rem] flex flex-col md:flex-row gap-8 items-center shadow-xl border border-zinc-800 animate-slide-up">
                          <div className="flex-grow w-full">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-xl font-bold text-white">{a.clientName}</span>
                              <span className="px-3 py-1 bg-zinc-800 text-[#E0BFB8] text-[8px] font-bold rounded-lg uppercase tracking-widest border border-zinc-700">Confirmado</span>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                              {a.services.map((s, idx) => (<span key={idx} className="text-[10px] font-bold uppercase text-zinc-500">• {s}</span>))}
                            </div>
                            <div className="flex gap-6">
                              <div className="text-[10px] font-bold uppercase text-zinc-500 flex items-center"><Calendar className="w-3 h-3 mr-1" /> {a.date}</div>
                              <div className="text-[10px] font-bold uppercase text-zinc-400 flex items-center"><Clock className="w-3 h-3 mr-1" /> {a.time}</div>
                              <div className="text-[10px] font-bold uppercase text-[#E0BFB8] flex items-center"><Sparkles className="w-3 h-3 mr-1" /> R$ {a.totalPrice}</div>
                            </div>
                          </div>
                          <button onClick={() => cancelConfirmed(a)} className="w-14 h-14 bg-zinc-800 text-red-400 rounded-2xl hover:bg-red-400 hover:text-white transition-all flex items-center justify-center"><Trash2 className="w-5 h-5" /></button>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            ) : (
              <div className="max-w-6xl mx-auto space-y-16 animate-slide-up">
                <h1 className="text-4xl font-bold serif">Ajustes do Estúdio</h1>

                {/* Gestão de Serviços */}
                <section className="bg-white p-10 rounded-[3.5rem] border border-[#F4E4E1] shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-4">
                    <h2 className="text-2xl font-bold serif">Gerenciar Cardápio</h2>
                    {bulkServiceSelection.length > 0 && (
                      <button 
                        onClick={() => {
                          setServices(prev => prev.filter(s => !bulkServiceSelection.includes(s.id)));
                          setBulkServiceSelection([]);
                          showToast('Itens removidos.');
                        }}
                        className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center"
                      >
                        <Trash2 className="w-3 h-3 mr-2" /> Excluir ({bulkServiceSelection.length})
                      </button>
                    )}
                  </div>

                  <form onSubmit={e => {
                    e.preventDefault();
                    const f = e.target as HTMLFormElement;
                    const ns: Service = {
                      id: Date.now().toString(),
                      name: (f.elements.namedItem('name') as HTMLInputElement).value,
                      price: Number((f.elements.namedItem('price') as HTMLInputElement).value),
                      duration: (f.elements.namedItem('duration') as HTMLInputElement).value,
                      icon: (f.elements.namedItem('icon') as HTMLSelectElement).value
                    };
                    setServices(p => [...p, ns]);
                    f.reset();
                    showToast('Procedimento adicionado!');
                  }} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
                    <input name="name" placeholder="Nome" required className="md:col-span-2 p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                    <input name="price" type="number" placeholder="R$" required className="p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                    <input name="duration" placeholder="Min" required className="p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                    <select name="icon" className="p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl">
                      <option value="Brush">Pincel</option><option value="Sparkles">Brilho</option><option value="Droplets">Gel</option><option value="Palette">Arte</option>
                    </select>
                    <button className="md:col-span-5 py-5 bg-zinc-900 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px]"><Plus className="w-4 h-4 inline mr-2" /> Criar Procedimento</button>
                  </form>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services.map(s => {
                      const isS = bulkServiceSelection.includes(s.id);
                      return (
                        <div key={s.id} onClick={() => setBulkServiceSelection(p => isS ? p.filter(id => id !== s.id) : [...p, s.id])}
                          className={`p-6 rounded-[2rem] border transition-all cursor-pointer relative ${isS ? 'border-[#E0BFB8] bg-rose-50/20' : 'border-[#F4E4E1] bg-white hover:border-[#E0BFB8]'}`}
                        >
                          <div className={`absolute top-6 left-6 w-5 h-5 rounded border-2 flex items-center justify-center ${isS ? 'bg-[#E0BFB8] border-[#E0BFB8]' : 'border-zinc-200 bg-white'}`}>
                            {isS && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                          </div>
                          <div className="ml-10">
                            <h3 className="font-bold text-zinc-900">{s.name}</h3>
                            <p className="text-[10px] font-bold text-zinc-400 uppercase mt-1">R$ {s.price} • {s.duration}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Bloqueio de Dias */}
                <section className="bg-white p-10 rounded-[3.5rem] border border-[#F4E4E1] shadow-sm">
                  <h2 className="text-2xl font-bold serif mb-8">Gestão de Calendário (Folgas)</h2>
                  <div className="flex flex-col md:flex-row gap-10">
                    <div className="flex-1 space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block ml-1">Bloquear Data</label>
                      <input type="date" onChange={e => {
                        const d = e.target.value;
                        if(d) {
                          setBlockedDates(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d]);
                          showToast('Calendário atualizado.');
                        }
                      }} className="w-full p-5 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 block ml-1">Dias Fechados</label>
                      <div className="flex flex-wrap gap-2">
                        {blockedDates.map((d, i) => (
                          <div key={i} className="px-5 py-2 bg-zinc-900 text-white rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center">
                            {d} <XCircle onClick={() => setBlockedDates(p => p.filter(x => x !== d))} className="w-4 h-4 ml-2 cursor-pointer hover:text-red-400 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Grade de Horários */}
                <section className="bg-white p-10 rounded-[3.5rem] border border-[#F4E4E1] shadow-sm">
                   <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                     <h2 className="text-2xl font-bold serif">Slots de Horário</h2>
                     <form onSubmit={e => {
                       e.preventDefault();
                       const t = (e.target as HTMLFormElement).elements.namedItem('time') as HTMLInputElement;
                       if(t.value && !customSlots.includes(t.value)) {
                         setCustomSlots(p => [...p, t.value]);
                         t.value = '';
                         showToast('Slot personalizado ativo!');
                       }
                     }} className="flex gap-2 w-full sm:w-auto">
                       <input name="time" type="time" required className="p-4 bg-[#FAF7F6] border border-[#F4E4E1] rounded-2xl text-xs font-bold" />
                       <button className="px-6 py-4 bg-zinc-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest">Ativar Slot</button>
                     </form>
                   </div>
                   <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                     {Array.from(new Set([...DEFAULT_SLOTS, ...customSlots])).sort().map(t => {
                       const isB = blockedSlots.includes(t);
                       return (
                         <button 
                           key={t} onClick={() => setBlockedSlots(p => isB ? p.filter(x => x !== t) : [...p, t])}
                           className={`py-4 rounded-2xl text-[11px] font-bold tracking-widest border transition-all ${
                             isB ? 'bg-red-50 border-red-100 text-red-400' : 'bg-white border-[#F4E4E1] text-zinc-900 hover:border-[#E0BFB8]'
                           }`}
                         >
                           {t}
                           {isB && <span className="block text-[8px] opacity-60">OFF</span>}
                         </button>
                       );
                     })}
                   </div>
                </section>
              </div>
            )}
          </main>

          {/* Admin Mobile Nav */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#F4E4E1] flex justify-around p-4 z-50">
            <button onClick={() => setAdminTab('agenda')} className={`flex flex-col items-center gap-1 ${adminTab === 'agenda' ? 'text-zinc-900' : 'text-zinc-300'}`}>
              <LayoutDashboard className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-widest">Agenda</span>
            </button>
            <button onClick={() => setAdminTab('config')} className={`flex flex-col items-center gap-1 ${adminTab === 'config' ? 'text-zinc-900' : 'text-zinc-300'}`}>
              <Settings className="w-5 h-5" /><span className="text-[9px] font-bold uppercase tracking-widest">Ajustes</span>
            </button>
          </nav>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {modal && <Modal isOpen title={modal.title} message={modal.message} onConfirm={modal.onConfirm} onCancel={() => setModal(null)} />}
    </div>
  );
}
