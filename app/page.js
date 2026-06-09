'use client'

import { useState, useEffect } from 'react'
import { db } from '../lib/firebase'
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore'

// ===== PUSAT SETTING TAMPILAN =====
// Ubah ukuran font tiap kolom di bawah ini.
// Semua nilai diterapkan di page ini dengan state `cfg`.
// Firestore `displaySettings` akan merge ke nilai default ini.
const DEFAULT_SETTINGS = {
  hadits: {
    fontArab: 2.4,            // Ukuran teks Arab pada kartu Hadits
    fontTerjemahan: 1.4,      // Ukuran teks terjemahan hadits
    fontSource: 0.85,         // Ukuran label sumber hadits
    paddingKonten: 1.5,       // Padding isi hadits
    intervalRotasi: 15,       // Detik per rotasi hadits
  },
  infoMasjid: {
    fontLabel: 1.7,           // Ukuran label "INFO MASJID"
    fontTeks: 1.1,            // Ukuran teks konten info
    tinggiKolom: 3.8,         // Tinggi panel Info Masjid
    intervalRotasi: 5,        // Detik per rotasi info
  },
  safety: {
    fontTeks: 1.0,            // Ukuran teks marquee Safety
    fontLabel: 1.8,           // Ukuran label "SAFETY"
    tinggiKolom: 2.8,         // Tinggi panel Safety
    kecepatanMarquee: 100,    // Durasi loop marquee dalam detik (semakin besar lebih lambat)
  },
  kas: {
    fontJudul: 1.2,           // Ukuran judul panel Kas Masjid
    fontLabel: 1.00,          // Ukuran label kecil seperti "Hari ini"
    fontTransaksi: 1.2,       // Ukuran teks untuk nama transaksi
    fontNominal: 1.2,         // Ukuran teks untuk nominal uang
    fontSaldo: 3.0,           // Ukuran teks saldo total
    lebarKolom: 32,           // Lebar kolom kanan dalam persen
  },
}

// Fallback jika Firebase belum ada datanya
const DEFAULT_SAFETY_TEXTS = [
  '⚠️ KESELAMATAN ADALAH PRIORITAS UTAMA — Selalu gunakan APD lengkap di area kerja.',
  '🦺 Patuhi prosedur K3 perusahaan demi keselamatan bersama.',
  '🚧 Laporkan kondisi tidak aman kepada supervisor segera.',
  '🔥 Dilarang merokok di area produksi dan sekitar masjid.',
  '🧯 Kenali lokasi APAR terdekat dan cara penggunaannya.',
  '🏥 Dalam keadaan darurat hubungi: Emergency Response Team PT.CPM.',
];

const DEFAULT_INFO_ITEMS = [
  { icon: '🕌', text: 'Sholat Jumat: Pukul 12.00 WIB — Harap hadir 15 menit sebelumnya' },
  { icon: '📢', text: 'Pengajian rutin setiap Rabu malam ba\'da Isya' },
  { icon: '💧', text: 'Infaq & Sedekah dapat diserahkan kepada pengurus masjid' },
  { icon: '📖', text: 'Tadarus Al-Qur\'an setiap ba\'da Subuh dan Maghrib' },
];

function App() {
  const [hadiths, setHadiths] = useState([]);
  const [loadingHadiths, setLoadingHadiths] = useState(true);
  const [currentHadithIndex, setCurrentHadithIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [currentInfoIndex, setCurrentInfoIndex] = useState(0);

  // Firebase state for saldo and transactions
  const [saldoMasjid, setSaldoMasjid] = useState(0);
  const [loadingSaldo, setLoadingSaldo] = useState(true);
  const [transactions, setTransactions] = useState([]);

  // Info masjid & safety dari Firebase
  const [infoItems, setInfoItems] = useState(DEFAULT_INFO_ITEMS);
  const [safetyTexts, setSafetyTexts] = useState(DEFAULT_SAFETY_TEXTS);
  const safetyMarqueeBase = safetyTexts.join('     •     ');
  const safetyMarqueeText = `${safetyMarqueeBase}     •     ${safetyMarqueeBase}`;

  // Display settings dari Firestore
  const [cfg, setCfg] = useState(DEFAULT_SETTINGS);

  // Load display settings dari Firestore
  useEffect(() => {
    const ref = doc(db, 'MasjidBakrie', 'displaySettings');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCfg({
          hadits:     { ...DEFAULT_SETTINGS.hadits,     ...data.hadits },
          infoMasjid: { ...DEFAULT_SETTINGS.infoMasjid, ...data.infoMasjid },
          safety:     { ...DEFAULT_SETTINGS.safety,     ...data.safety },
          kas:        { ...DEFAULT_SETTINGS.kas,        ...data.kas },
        });
      }
    });
    return () => unsub();
  }, []);

  // Load info masjid dari Firestore
  useEffect(() => {
    const ref = doc(db, 'MasjidBakrie', 'infoMasjid');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.items && data.items.length > 0) {
          setInfoItems(data.items);
        }
      }
    });
    return () => unsub();
  }, []);

  // Load safety texts dari Firestore
  useEffect(() => {
    const ref = doc(db, 'MasjidBakrie', 'safetyTexts');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.texts && data.texts.length > 0) {
          setSafetyTexts(data.texts);
        }
      }
    });
    return () => unsub();
  }, []);

  // Fetch hadiths from Firestore
  useEffect(() => {
    setIsClient(true);
    setLoadingHadiths(true);
    const hadithsRef = collection(db, 'MasjidBakrie', 'yHXCuejUUlzeO6yMLTey', 'hadiths');
    const q = query(hadithsRef, orderBy('position', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hadithsData = [];
      snapshot.forEach((doc) => {
        hadithsData.push({ id: doc.id, ...doc.data() });
      });
      setHadiths(hadithsData);
      setLoadingHadiths(false);
    }, (error) => {
      console.error('❌ Error fetching hadiths:', error);
      setHadiths([]);
      setLoadingHadiths(false);
    });
    return () => unsubscribe();
  }, []);

  // Rotasi hadith
  useEffect(() => {
    if (loadingHadiths || hadiths.length === 0) return;
    const ms = (cfg.hadits.intervalRotasi || 15) * 1000;
    const interval = setInterval(() => {
      setCurrentHadithIndex((prev) => (prev + 1) % hadiths.length);
      setTimeLeft(cfg.hadits.intervalRotasi || 15);
    }, ms);
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : cfg.hadits.intervalRotasi || 15));
    }, 1000);
    return () => { clearInterval(interval); clearInterval(timer); };
  }, [hadiths.length, loadingHadiths, cfg.hadits.intervalRotasi]);

  // Rotasi info masjid
  useEffect(() => {
    const ms = (cfg.infoMasjid.intervalRotasi || 5) * 1000;
    const interval = setInterval(() => {
      setCurrentInfoIndex((prev) => (prev + 1) % infoItems.length);
    }, ms);
    return () => clearInterval(interval);
  }, [cfg.infoMasjid.intervalRotasi, infoItems.length]);

  // Update jam
  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch saldo dari Firestore
  useEffect(() => {
    setLoadingSaldo(true);
    const cashDocRef = doc(db, 'MasjidBakrie', '12S687VkZHdxufuD6Uzj');
    const unsubscribe = onSnapshot(cashDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSaldoMasjid(data.saldo || 0);
        setTransactions(data.transactions || []);
      } else {
        setSaldoMasjid(0);
        setTransactions([]);
      }
      setLoadingSaldo(false);
    }, (error) => {
      console.error('❌ Error fetching saldo:', error);
      setSaldoMasjid(0);
      setTransactions([]);
      setLoadingSaldo(false);
    });
    return () => unsubscribe();
  }, []);

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(angka);
  };

  const getLatestIncomes = () =>
    transactions.filter(t => t.type === 'income').slice(0, 2);

  const getLatestExpenses = () =>
    transactions.filter(t => t.type === 'expense').slice(0, 2);

  const formatTransactionDate = (transaction) => {
    if (!transaction) return '-';
    if (transaction.date) return transaction.date;
    if (transaction.createdAt) {
      try {
        if (typeof transaction.createdAt.toDate === 'function') {
          return transaction.createdAt.toDate().toLocaleDateString('id-ID', {
            day: 'numeric', month: 'short', year: 'numeric'
          });
        }
        return new Date(transaction.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric', month: 'short', year: 'numeric'
        });
      } catch (e) { return '-'; }
    }
    return '-';
  };

  const formatTime = (date) => {
    if (!date) return '00:00:00';
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen w-full min-w-full overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 font-sans relative flex flex-col">

      {/* Islamic Pattern Background */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 20L95 55L60 90L25 55L60 20Z' fill='none' stroke='%23FFD700' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '140px 140px'
        }}></div>
      </div>

      {/* Ambient Orbs */}
      <div className="absolute top-0 right-0 w-[700px] h-[700px] bg-amber-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* ── HEADER ── */}
      <header className="relative flex-shrink-0 px-4 lg:px-8 py-2 lg:py-3 z-10">
        <div className="flex items-center justify-between">
          {/* Logo + Judul */}
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl shadow-2xl flex items-center justify-center border-2 border-amber-300">
                <span className="text-2xl lg:text-3xl text-white drop-shadow-lg">🕌</span>
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-base lg:text-2xl xl:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-400 tracking-wide">
                MASJID AL IHSAN BAKRIE PT.CPM
              </h1>
              <p className="text-xs lg:text-sm text-emerald-300 tracking-widest mt-0.5">BERKAH • ISTIQOMAH • BERDAYA</p>
            </div>
          </div>

          {/* Jam & Tanggal */}
          <div className="rounded-xl shadow-lg border border-amber-500/50 overflow-hidden" style={{ backgroundColor: 'rgba(6, 78, 59, 0.7)' }}>
            <div className="px-4 py-2 text-right">
              <p className="text-2xl lg:text-3xl font-mono font-bold text-amber-400 drop-shadow-lg">
                {isClient ? formatTime(currentTime) : '00:00:00'}
              </p>
              <p className="text-xs lg:text-sm text-emerald-300 mt-0.5">
                {isClient ? getCurrentDate() : '-'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 px-3 lg:px-6 xl:px-8 flex flex-col lg:flex-row gap-3 lg:gap-5 z-10 relative min-h-0">

        {/* ── KOLOM KIRI ── */}
        <div className="w-full flex flex-col h-full gap-2 lg:gap-3" style={{ width: `${100 - cfg.kas.lebarKolom}%` }}>

          {/* Label Hadits + Progress */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
            <h2 className="text-xs lg:text-sm font-medium text-amber-400 uppercase tracking-widest">HADITS PILIHAN</h2>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgb(245,158,11), transparent)' }}></div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-300">Next in</span>
              <div className="w-20 h-2 bg-emerald-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 linear"
                  style={{
                    width: `${(timeLeft / 15) * 100}%`,
                    background: 'linear-gradient(to right, rgb(245,158,11), rgb(217,119,6))'
                  }}></div>
              </div>
              <span className="text-xs text-amber-400 font-mono font-medium">{timeLeft}s</span>
            </div>
          </div>

          {/* Hadits Card */}
          <div className="rounded-2xl lg:rounded-[2rem] shadow-2xl border-2 border-amber-500 overflow-hidden flex flex-col"
            style={{ backgroundColor: 'rgba(6, 78, 59, 0.85)', flex: '1 1 0', minHeight: 0 }}>
            <div className="h-full flex flex-col">
              {/* Badge Kategori */}
              <div className="px-5 lg:px-8 pt-4 lg:pt-5 flex-shrink-0">
                <span className="inline-block px-4 lg:px-5 py-1.5 rounded-full text-amber-50 text-xs lg:text-sm font-semibold shadow-xl border-2 border-amber-400"
                  style={{ backgroundColor: 'rgb(245,158,11)' }}>
                  {hadiths[currentHadithIndex]?.category?.toUpperCase() || 'HADITS PILIHAN'}
                </span>
              </div>

              {/* Konten Hadits */}
              <div className="flex-1 overflow-y-auto min-h-0" style={{ padding: `${cfg.hadits.paddingKonten}rem` }}>
                {loadingHadiths ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="inline-block w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-amber-300 text-lg">Memuat hadits...</p>
                    </div>
                  </div>
                ) : hadiths[currentHadithIndex] ? (
                  <>
                    {/* Teks Arab */}
                    <div className="text-right mb-3 lg:mb-4">
                      <p className="text-amber-300 break-words" style={{
                        fontFamily: "'Amiri', 'Traditional Arabic', serif",
                        direction: 'rtl',
                        fontSize: `${cfg.hadits.fontArab}rem`,
                        lineHeight: '2',
                        textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                      }}>
                        {hadiths[currentHadithIndex].arabic}
                      </p>
                    </div>

                    {/* Terjemahan */}
                    <div className="mb-3 lg:mb-4">
                      <p className="text-amber-200 leading-relaxed italic font-normal"
                        style={{
                          borderLeft: '4px solid rgb(245,158,11)',
                          paddingLeft: '1.25rem',
                          fontSize: `${cfg.hadits.fontTerjemahan}rem`
                        }}>
                        "{hadiths[currentHadithIndex].translation}"
                      </p>
                    </div>

                    {/* Source + Dots */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <span className="text-amber-400 px-3 lg:px-4 py-1.5 rounded-full border border-amber-500"
                        style={{ backgroundColor: 'rgba(6,78,59,0.5)', fontSize: `${cfg.hadits.fontSource}rem` }}>
                        {hadiths[currentHadithIndex].source}
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hadiths.map((_, index) => (
                          <button key={index}
                            className={`rounded-full transition-all duration-500 ${index === currentHadithIndex ? 'w-6 h-2' : 'w-2 h-2'}`}
                            style={{
                              backgroundColor: index === currentHadithIndex ? 'rgb(245,158,11)' : 'rgba(6,78,59,0.5)'
                            }}
                            onClick={() => { setCurrentHadithIndex(index); setTimeLeft(15); }}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-amber-300 text-lg">Tidak ada hadits tersedia</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── KOLOM INFO ── */}
          <div className="flex-shrink-0 rounded-xl lg:rounded-2xl border-2 border-amber-500 overflow-hidden"
            style={{ backgroundColor: 'rgba(6, 78, 59, 0.85)', height: `${cfg.infoMasjid.tinggiKolom}rem` }}>
            <div className="flex items-center gap-3 px-4 lg:px-6 h-full">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-base lg:text-xl">📋</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-amber-400 uppercase tracking-widest mb-0.5"
                  style={{ fontSize: `${cfg.infoMasjid.fontLabel}rem` }}>INFO MASJID</p>
                <p className="text-amber-100 font-medium leading-snug truncate"
                  style={{ fontSize: `${cfg.infoMasjid.fontTeks}rem` }}>
                  {infoItems[currentInfoIndex]?.icon} {infoItems[currentInfoIndex]?.text}
                </p>
              </div>
              {/* Dots indikator info */}
              <div className="flex gap-1 flex-shrink-0">
                {infoItems.map((_, i) => (
                  <span key={i} className="rounded-full transition-all duration-300"
                    style={{
                      width: i === currentInfoIndex ? '20px' : '8px',
                      height: '8px',
                      backgroundColor: i === currentInfoIndex ? 'rgb(245,158,11)' : 'rgba(245,158,11,0.3)'
                    }} />
                ))}
              </div>
            </div>
          </div>

          {/* ── TEXT BERJALAN SAFETY ── */}
          <div className="flex-shrink-0 rounded-xl border-2 border-amber-600 overflow-hidden flex items-center"
            style={{ backgroundColor: 'rgba(120, 53, 15, 0.7)', height: `${cfg.safety.tinggiKolom}rem` }}>
            <div className="flex-shrink-0 px-3 lg:px-4 flex items-center gap-2 border-r border-amber-600 h-full"
              style={{ backgroundColor: 'rgb(180, 83, 9)' }}>
              <span style={{ fontSize: `${cfg.safety.fontLabel * 1.4}rem` }}>⚠️</span>
              <span className="font-bold text-amber-100 uppercase tracking-wider whitespace-nowrap"
                style={{ fontSize: `${cfg.safety.fontLabel}rem` }}>SAFETY</span>
            </div>
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
              <div className="animate-marquee whitespace-nowrap text-amber-200 font-medium px-4"
                style={{ fontSize: `${cfg.safety.fontTeks}rem`, display: 'inline-flex' }}>
                {safetyMarqueeText}
              </div>
            </div>
          </div>

        </div>

        {/* ── KOLOM KANAN — KAS MASJID ── */}
        <div className="flex flex-col h-full" style={{ width: `${cfg.kas.lebarKolom}%` }}>
          <div className="flex-1 rounded-xl lg:rounded-2xl shadow-2xl border-2 border-amber-500 overflow-hidden flex flex-col"
            style={{ backgroundColor: 'rgba(6, 78, 59, 0.85)' }}>

            {/* Header Kas */}
            <div className="px-4 lg:px-5 py-3 border-b-2 border-amber-500 flex-shrink-0"
              style={{ backgroundColor: 'rgb(217, 119, 6)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 lg:w-9 lg:h-9 bg-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-base lg:text-lg text-white">💰</span>
                </div>
                <div>
                  <h3 className="font-bold text-amber-100 uppercase tracking-wider"
                    style={{ fontSize: `${cfg.kas.fontJudul}rem` }}>KAS MASJID</h3>
                  <p className="text-amber-200" style={{ fontSize: `${cfg.kas.fontLabel}rem` }}>Hari ini</p>
                </div>
              </div>
            </div>

            {/* Isi Kas */}
            <div className="flex-1 p-3 lg:p-4 flex flex-col gap-2 lg:gap-3 overflow-y-auto min-h-0">

              {/* Pemasukan Terakhir */}
              <div>
                <h4 className="font-bold text-emerald-300 uppercase tracking-wider mb-2"
                  style={{ fontSize: `${cfg.kas.fontLabel}rem` }}>
                  Pemasukan Terakhir
                </h4>
                <div className="space-y-2">
                  {loadingSaldo ? (
                    Array(2).fill(0).map((_, idx) => (
                      <div key={idx} className="rounded-lg p-2.5 border border-emerald-600 animate-pulse"
                        style={{ backgroundColor: 'rgba(6,78,59,0.5)' }}>
                        <div className="h-4 bg-emerald-700 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-emerald-800 rounded w-1/2"></div>
                      </div>
                    ))
                  ) : getLatestIncomes().length > 0 ? (
                    getLatestIncomes().map((t, idx) => (
                      <div key={idx} className="rounded-lg p-2.5 border border-emerald-500 flex items-center justify-between gap-2"
                        style={{ backgroundColor: 'rgba(6,78,59,0.6)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base lg:text-lg flex-shrink-0">📥</span>
                          <div className="min-w-0">
                            <p className="text-emerald-100 font-medium truncate leading-tight font-bold"
                              style={{ fontSize: `${cfg.kas.fontTransaksi}rem` }}>
                              {t.description || ''}
                            </p>
                            <p className="text-emerald-400 font-bold"
                              style={{ fontSize: `${cfg.kas.fontNominal}rem` }}>
                              +{formatRupiah(t.amount || 0)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs lg:text-sm text-emerald-300 whitespace-nowrap flex-shrink-0 text-right">
                          {formatTransactionDate(t)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg p-2.5 border border-amber-500 text-center"
                      style={{ backgroundColor: 'rgba(6,78,59,0.5)' }}>
                      <p className="text-sm text-amber-300/60 italic">Belum ada pemasukan</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pengeluaran Terakhir */}
              <div className="border-t border-amber-500/30 pt-2 lg:pt-3">
                <h4 className="font-bold text-red-300 uppercase tracking-wider mb-2"
                  style={{ fontSize: `${cfg.kas.fontLabel}rem` }}>
                  Pengeluaran Terakhir
                </h4>
                <div className="space-y-2">
                  {loadingSaldo ? (
                    Array(2).fill(0).map((_, idx) => (
                      <div key={idx} className="rounded-lg p-2.5 border border-red-800 animate-pulse"
                        style={{ backgroundColor: 'rgba(153,27,27,0.3)' }}>
                        <div className="h-4 bg-red-900 rounded w-3/4 mb-1"></div>
                        <div className="h-3 bg-red-950 rounded w-1/2"></div>
                      </div>
                    ))
                  ) : getLatestExpenses().length > 0 ? (
                    getLatestExpenses().map((t, idx) => (
                      <div key={idx} className="rounded-lg p-2.5 border border-red-500 flex items-center justify-between gap-2"
                        style={{ backgroundColor: 'rgba(153,27,27,0.4)' }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base lg:text-lg flex-shrink-0">📤</span>
                          <div className="min-w-0">
                            <p className="text-red-100 font-medium truncate leading-tight"
                              style={{ fontSize: `${cfg.kas.fontTransaksi}rem` }}>
                              {t.description || ''}
                            </p>
                            <p className="text-red-400 font-bold"
                              style={{ fontSize: `${cfg.kas.fontNominal}rem` }}>
                              -{formatRupiah(t.amount || 0)}
                            </p>
                          </div>
                        </div>
                        <p className="text-xs lg:text-sm text-red-300 whitespace-nowrap flex-shrink-0 text-right">
                          {formatTransactionDate(t)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg p-2.5 border border-amber-500 text-center"
                      style={{ backgroundColor: 'rgba(6,78,59,0.5)' }}>
                      <p className="text-sm text-amber-300/60 italic">Belum ada pengeluaran</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Saldo */}
              <div className="mt-auto pt-3 border-t-2 border-amber-500">
                <p className="text-emerald-200 font-light mb-1 text-center"
                  style={{ fontSize: `${cfg.kas.fontLabel}rem` }}>
                  {loadingSaldo ? 'Mengambil data...' : 'Total saldo tersedia'}
                </p>
                <p className="font-bold text-amber-300 text-center drop-shadow-lg"
                  style={{ fontSize: `${cfg.kas.fontSaldo}rem` }}>
                  {loadingSaldo ? 'Memuat...' : formatRupiah(saldoMasjid)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="flex-shrink-0 relative border-t-0 border-amber-500 py-2 z-10"
        style={{ backgroundColor: 'transparent' }}>
        <div className="px-4 lg:px-8 flex items-center justify-between text-xs lg:text-sm">
          <p className="text-amber-300">© 2026 Masjid Al Ihsan Bakrie PT.CPM</p>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
            <p className="text-amber-400 font-bold">Team ITE CPM</p>
            <span className="w-1 h-1 bg-amber-400 rounded-full"></span>
          </div>
        </div>
      </footer>

      {/* CSS animasi marquee — kecepatan dari settings */}
      <style jsx>{`
        @keyframes marquee {
          0%   { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: inline-flex;
          animation: marquee ${cfg.safety.kecepatanMarquee}s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default App