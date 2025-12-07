import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, Plus, Search, Cloud, CloudUpload, CloudDownload, 
  Trash2, Calendar, ShieldCheck, AlertTriangle, Smartphone, 
  X, Check, Box, QrCode 
} from 'lucide-react';

// --- Types ---
interface Product {
  id: string;
  name: string;
  serialNumber: string;
  purchaseDate: string; // YYYY-MM-DD
  warrantyMonths: number;
  category: string;
  notes?: string;
}

interface BackupData {
  userId: string;
  products: Product[];
  date: string;
}

// --- App ---
export default function App() {
  const [view, setView] = useState<'dashboard' | 'scan' | 'list' | 'settings'>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Scanning State
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);

  // Sync State
  const [serverUrl, setServerUrl] = useState('http://localhost:3000'); // Default local nodejs
  const [userId, setUserId] = useState('');
  const [syncStatus, setSyncStatus] = useState<{msg: string, type: 'success' | 'error' | 'neutral'}>({msg: '', type: 'neutral'});

  // Load Data on Mount
  useEffect(() => {
    const saved = localStorage.getItem('WG_PRODUCTS');
    const savedUser = localStorage.getItem('WG_USERID');
    const savedUrl = localStorage.getItem('WG_URL');
    
    if (saved) setProducts(JSON.parse(saved));
    if (savedUser) setUserId(savedUser);
    if (savedUrl) setServerUrl(savedUrl);
  }, []);

  // Save Data on Change
  useEffect(() => {
    localStorage.setItem('WG_PRODUCTS', JSON.stringify(products));
  }, [products]);

  // --- Logic: Warranty Calculation ---
  const getWarrantyStatus = (product: Product) => {
    const purchase = new Date(product.purchaseDate);
    const expire = new Date(purchase);
    expire.setMonth(expire.getMonth() + product.warrantyMonths);
    
    const today = new Date();
    const timeLeft = expire.getTime() - today.getTime();
    const daysLeft = Math.ceil(timeLeft / (1000 * 3600 * 24));
    
    return {
      isValid: daysLeft > 0,
      daysLeft,
      expireDate: expire.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  };

  // --- Logic: Add Product ---
  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.get('name') as string,
      serialNumber: scannedCode || formData.get('serialNumber') as string,
      purchaseDate: formData.get('purchaseDate') as string,
      warrantyMonths: parseInt(formData.get('warrantyMonths') as string),
      category: formData.get('category') as string,
      notes: formData.get('notes') as string
    };

    setProducts([newProduct, ...products]);
    setScannedCode(null);
    setView('list');
    
    // Stop scanner if active
    if(scannerRef.current) {
       scannerRef.current.clear();
    }
  };

  const handleDelete = (id: string) => {
    if(confirm('Hapus data produk ini?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  // --- Logic: Backup & Restore (NodeJS) ---
  const handleBackup = async () => {
    if(!userId) return setSyncStatus({msg: 'Isi User ID dulu!', type: 'error'});
    
    setSyncStatus({msg: 'Sedang upload...', type: 'neutral'});
    try {
      const payload: BackupData = { userId, products, date: new Date().toISOString() };
      const res = await fetch(`${serverUrl}/api/backup`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      if(res.ok) {
        setSyncStatus({msg: 'Backup Berhasil!', type: 'success'});
        localStorage.setItem('WG_USERID', userId);
        localStorage.setItem('WG_URL', serverUrl);
      } else {
        throw new Error('Gagal');
      }
    } catch (e) {
      setSyncStatus({msg: 'Gagal connect ke server', type: 'error'});
    }
  };

  const handleRestore = async () => {
    if(!userId) return setSyncStatus({msg: 'Isi User ID dulu!', type: 'error'});
    
    setSyncStatus({msg: 'Sedang download...', type: 'neutral'});
    try {
      const res = await fetch(`${serverUrl}/api/restore/${userId}`);
      if(res.ok) {
        const data: BackupData = await res.json();
        setProducts(data.products);
        setSyncStatus({msg: `Restore Berhasil! (${data.products.length} Item)`, type: 'success'});
        localStorage.setItem('WG_USERID', userId);
        localStorage.setItem('WG_URL', serverUrl);
      } else {
        setSyncStatus({msg: 'Data tidak ditemukan', type: 'error'});
      }
    } catch (e) {
      setSyncStatus({msg: 'Gagal connect ke server', type: 'error'});
    }
  };

  // --- Views ---

  // 1. Scanner Component
  const ScannerView = () => {
    useEffect(() => {
        // Dynamic import logic for Html5QrcodeScanner would go here typically, 
        // but since we loaded script in index.html, we use global variable.
        // We simulate a mounting delay to ensure div is ready
        const timeout = setTimeout(() => {
            const html5QrcodeScanner = new (window as any).Html5QrcodeScanner(
                "reader", 
                { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
                /* verbose= */ false
            );
            
            html5QrcodeScanner.render((decodedText: string) => {
                setScannedCode(decodedText);
                html5QrcodeScanner.clear();
            }, (error: any) => {
                // ignore errors for better UX
            });
            scannerRef.current = html5QrcodeScanner;
        }, 100);

        return () => {
             if(scannerRef.current) scannerRef.current.clear().catch(() => {});
             clearTimeout(timeout);
        };
    }, []);

    if(scannedCode) {
        return (
            <div className="p-4 animate-slide-up pb-24">
                <div className="glass-card p-6 rounded-2xl mb-6 border-l-4 border-green-500">
                    <div className="flex items-center gap-3 mb-2">
                        <Check className="text-green-400" />
                        <span className="text-green-400 font-bold uppercase tracking-wider">Scan Berhasil</span>
                    </div>
                    <p className="text-3xl font-mono text-white break-all">{scannedCode}</p>
                </div>

                <form onSubmit={handleAddProduct} className="flex flex-col gap-4">
                    <div className="space-y-1">
                        <label className="text-sm text-slate-400">Nama Produk</label>
                        <input name="name" required placeholder="Contoh: Laptop Gaming" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-blue-500 outline-none transition" />
                    </div>
                    
                    {/* Hidden S/N field, but visible to user as text above */}
                    <input type="hidden" name="serialNumber" value={scannedCode} />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm text-slate-400">Tanggal Beli</label>
                            <input name="purchaseDate" type="date" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white outline-none" />
                        </div>
                        <div className="space-y-1">
                             <label className="text-sm text-slate-400">Garansi (Bulan)</label>
                             <input name="warrantyMonths" type="number" defaultValue="12" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white outline-none" />
                        </div>
                    </div>

                     <div className="space-y-1">
                        <label className="text-sm text-slate-400">Kategori</label>
                        <select name="category" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white outline-none">
                            <option value="Elektronik">Elektronik</option>
                            <option value="Gadget">Gadget</option>
                            <option value="Otomotif">Otomotif</option>
                            <option value="Rumah Tangga">Rumah Tangga</option>
                            <option value="Lainnya">Lainnya</option>
                        </select>
                    </div>

                    <div className="space-y-1">
                         <label className="text-sm text-slate-400">Catatan (Toko, dll)</label>
                         <textarea name="notes" rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white outline-none"></textarea>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={() => setScannedCode(null)} className="flex-1 py-4 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700">Ulangi Scan</button>
                        <button type="submit" className="flex-1 py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20">Simpan Data</button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center h-[80vh] p-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Arahkan Kamera ke Barcode/QR</h2>
            <div className="w-full max-w-sm bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-700 relative">
                <div id="reader" className="w-full"></div>
                {/* Overlay lines to make it look cool */}
                <div className="absolute inset-0 pointer-events-none border-[30px] border-black/50"></div>
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-red-500/50 shadow-[0_0_10px_red]"></div>
            </div>
            <button onClick={() => setView('dashboard')} className="mt-8 px-6 py-2 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">
                Batal
            </button>
        </div>
    );
  };

  // 2. Dashboard Component
  const DashboardView = () => {
    const activeWarranty = products.filter(p => getWarrantyStatus(p).isValid).length;
    const expiredWarranty = products.length - activeWarranty;

    return (
        <div className="p-4 space-y-6 pb-24 animate-slide-up">
            <header className="flex justify-between items-center py-2">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">WarrantyGuard</h1>
                    <p className="text-slate-400 text-sm">Kelola asetmu dengan aman</p>
                </div>
                <div className="bg-slate-800 p-2 rounded-full">
                    <ShieldCheck className="text-blue-500" />
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                        <Check className="text-green-500 w-5 h-5" />
                        <span className="text-3xl font-bold text-white">{activeWarranty}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Garansi Aktif</p>
                </div>
                <div className="glass-card p-4 rounded-2xl">
                    <div className="flex justify-between items-start mb-2">
                        <AlertTriangle className="text-red-500 w-5 h-5" />
                        <span className="text-3xl font-bold text-white">{expiredWarranty}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Expired</p>
                </div>
            </div>

            {/* Quick Action */}
            <button onClick={() => setView('scan')} className="w-full py-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-900/40 flex items-center justify-center gap-3 group active:scale-95 transition-all">
                <div className="bg-white/20 p-2 rounded-lg group-hover:rotate-90 transition-transform">
                    <QrCode className="text-white" />
                </div>
                <span className="text-xl font-bold text-white">Scan Produk Baru</span>
            </button>

            {/* Recent Items */}
            <div>
                <div className="flex justify-between items-end mb-4">
                    <h3 className="text-lg font-bold text-white">Baru Ditambahkan</h3>
                    <button onClick={() => setView('list')} className="text-blue-400 text-sm hover:underline">Lihat Semua</button>
                </div>
                <div className="space-y-3">
                    {products.slice(0, 3).map(product => {
                         const status = getWarrantyStatus(product);
                         return (
                            <div key={product.id} className="glass-card p-4 rounded-xl flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status.isValid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                    <Box size={20} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-white">{product.name}</h4>
                                    <p className="text-xs text-slate-400 font-mono">{product.serialNumber}</p>
                                </div>
                                <div className="text-right">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${status.isValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {status.isValid ? `${status.daysLeft} Hari` : 'Expired'}
                                    </span>
                                </div>
                            </div>
                         );
                    })}
                    {products.length === 0 && (
                        <div className="text-center py-8 text-slate-500 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
                            Belum ada data produk.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
  };

  // 3. List Component
  const ListView = () => {
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 pb-24 h-screen flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Daftar Produk</h2>
            <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Cari nama atau S/N..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 rounded-xl py-3 pl-12 pr-4 text-white outline-none border border-slate-700 focus:border-blue-500 transition"
                />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                {filtered.map(product => {
                    const status = getWarrantyStatus(product);
                    return (
                        <div key={product.id} className="glass-card p-5 rounded-xl group relative overflow-hidden">
                            <div className={`absolute top-0 left-0 w-1 h-full ${status.isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            
                            <div className="flex justify-between items-start mb-2 pl-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{product.name}</h3>
                                    <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{product.category}</span>
                                </div>
                                <button onClick={() => handleDelete(product.id)} className="p-2 text-slate-500 hover:text-red-500 transition">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            
                            <div className="pl-3 grid grid-cols-2 gap-4 mt-4 text-sm">
                                <div>
                                    <p className="text-slate-500 text-xs">Serial Number</p>
                                    <p className="font-mono text-blue-300 select-all">{product.serialNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-slate-500 text-xs">Berakhir Pada</p>
                                    <p className="text-white">{status.expireDate}</p>
                                </div>
                            </div>
                            
                            {!status.isValid && (
                                <div className="mt-3 pl-3 pt-3 border-t border-slate-700/50 flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-red-500" />
                                    <span className="text-xs text-red-400 font-bold">Masa Garansi Telah Habis</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  // 4. Settings/Backup Component
  const SettingsView = () => (
    <div className="p-4 pb-24 animate-slide-up">
        <h2 className="text-2xl font-bold mb-6">Backup & Restore</h2>
        
        <div className="glass-card p-6 rounded-2xl mb-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Cloud size={20} className="text-blue-400" /> Konfigurasi Server
            </h3>
            
            <div className="space-y-4">
                <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide">Server URL (NodeJS)</label>
                    <input 
                        value={serverUrl} 
                        onChange={e => setServerUrl(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white font-mono text-sm mt-1" 
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wide">User ID (Unik)</label>
                    <input 
                        value={userId} 
                        onChange={e => setUserId(e.target.value)}
                        placeholder="contoh: budi_123"
                        className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white mt-1" 
                    />
                </div>
            </div>
            
            {syncStatus.msg && (
                <div className={`mt-4 p-3 rounded-lg text-sm font-bold text-center ${
                    syncStatus.type === 'success' ? 'bg-green-500/20 text-green-400' : 
                    syncStatus.type === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                    {syncStatus.msg}
                </div>
            )}
        </div>

        <div className="grid grid-cols-1 gap-4">
            <button onClick={handleBackup} className="glass-card p-5 rounded-xl flex items-center gap-4 hover:bg-slate-800 transition group border-l-4 border-blue-500">
                <div className="bg-blue-500/20 p-3 rounded-full text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <CloudUpload size={24} />
                </div>
                <div className="text-left">
                    <h4 className="font-bold text-white">Backup ke Cloud</h4>
                    <p className="text-xs text-slate-400">Simpan data lokal ke server</p>
                </div>
            </button>

            <button onClick={handleRestore} className="glass-card p-5 rounded-xl flex items-center gap-4 hover:bg-slate-800 transition group border-l-4 border-green-500">
                <div className="bg-green-500/20 p-3 rounded-full text-green-400 group-hover:bg-green-500 group-hover:text-white transition-colors">
                    <CloudDownload size={24} />
                </div>
                <div className="text-left">
                    <h4 className="font-bold text-white">Restore Data</h4>
                    <p className="text-xs text-slate-400">Ambil data saat ganti HP</p>
                </div>
            </button>
        </div>
        
        <div className="mt-8 p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-xs text-slate-400 leading-relaxed">
            <p className="font-bold text-slate-300 mb-1">Cara Menjalankan Server Backup:</p>
            1. Install NodeJS di komputer.<br/>
            2. Buat file `server.js` (kode tersedia).<br/>
            3. Jalankan `node server.js`.<br/>
            4. Pastikan HP dan Laptop di WiFi yang sama.<br/>
            5. Ganti Server URL dengan IP Laptop (misal: http://192.168.1.5:3000).
        </div>
    </div>
  );

  // --- Main Render ---
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-900 shadow-2xl overflow-hidden relative">
      
      {/* Dynamic Content */}
      <div className="h-full">
         {view === 'dashboard' && <DashboardView />}
         {view === 'scan' && <ScannerView />}
         {view === 'list' && <ListView />}
         {view === 'settings' && <SettingsView />}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto glass border-t border-slate-700 px-6 py-4 flex justify-between items-center z-50 rounded-t-2xl">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 transition ${view === 'dashboard' ? 'text-blue-400' : 'text-slate-500'}`}>
            <Box size={24} className={view === 'dashboard' ? 'fill-blue-400/20' : ''} />
            <span className="text-[10px] font-bold">Home</span>
        </button>
        
        {/* Floating Scan Button */}
        <div className="relative -top-6">
            <button onClick={() => setView('scan')} className="bg-blue-600 w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 border-4 border-slate-900 active:scale-95 transition-transform">
                <Scan size={24} className="text-white" />
            </button>
        </div>

        <button onClick={() => setView('settings')} className={`flex flex-col items-center gap-1 transition ${view === 'settings' ? 'text-blue-400' : 'text-slate-500'}`}>
            <Smartphone size={24} className={view === 'settings' ? 'fill-blue-400/20' : ''} />
            <span className="text-[10px] font-bold">Backup</span>
        </button>
      </nav>
    </div>
  );
}