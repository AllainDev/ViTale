'use client';

import { useEffect, useState, useMemo } from 'react';
import { QrCode, Search, ChevronRight, RefreshCw, KeyRound, CheckCircle, AlertCircle, Download, ChevronLeft } from 'lucide-react';
import AvatarRenderer from '@/components/AvatarRenderer';
import { QRCodeSVG } from 'qrcode.react';

type Doll = {
  id: string;
  sku: string;
  region: string;
  modelUrl: string;
  createdAt: string;
  tokens: { total: number; unused: number; used: number; };
};

type Token = {
  id: string;
  token: string;
  generatedAt: string;
  status: 'available' | 'used' | 'expired';
};

export default function AdminTokensPage() {
  const [dolls, setDolls] = useState<Doll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoll, setSelectedDoll] = useState<Doll | null>(null);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [generateCount, setGenerateCount] = useState(10);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 3000); };

  // Search & Pagination states
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('vitale_admin_token')}`
  });

  const fetchDolls = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dolls`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setDolls(data.dolls || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchTokens = async (dollId: string) => {
    setLoadingTokens(true);
    setSearchTerm("");
    setCurrentPage(1);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dolls/${dollId}/tokens`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTokens(data.tokens || []);
      }
    } catch { /* ignore */ }
    setLoadingTokens(false);
  };

  useEffect(() => {
    fetchDolls();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoll) return;
    setGenerating(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/dolls/${selectedDoll.id}/tokens`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: generateCount })
      });
      if (res.ok) {
        showToast('Tạo Token thành công!');
        fetchTokens(selectedDoll.id);
        fetchDolls();
      } else {
        showToast('Có lỗi xảy ra khi tạo token');
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const downloadQR = (tokenId: string, tokenString: string) => {
    const svg = document.getElementById(`qr-${tokenId}`);
    if (!svg) return;
    
    const clonedSvg = svg.cloneNode(true) as SVGElement;
    clonedSvg.setAttribute('width', '512');
    clonedSvg.setAttribute('height', '512');
    
    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 512, 512);
        ctx.drawImage(img, 0, 0);
      }
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${tokenString.substring(0,8)}.png`;
      downloadLink.href = `${pngFile}`;
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  // Filter and paginate tokens
  const filteredTokens = useMemo(() => {
    return tokens.filter(t => t.token.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [tokens, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredTokens.length / itemsPerPage));
  const currentTokens = useMemo(() => {
    return filteredTokens.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredTokens, currentPage, itemsPerPage]);

  return (
    <div>
      {toastMsg && <div className="fixed top-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded shadow-lg z-50 animate-fadeIn">{toastMsg}</div>}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 m-0">Quản lý Doll Tokens (QR)</h1>
        </div>
        <ol className="flex text-sm text-gray-500">
          <li><a href="/admin/dashboard" className="text-blue-600 hover:underline">Home</a></li>
          <li className="px-2">/</li>
          <li className="text-gray-400">Tokens</li>
        </ol>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Col 1: 3D Preview (Toàn thân) */}
        <div className="lg:col-span-4 flex flex-col h-[calc(100vh-140px)]">
          {selectedDoll ? (
             <div className="bg-slate-900 rounded shadow-sm border border-gray-200 h-full relative flex-shrink-0 flex flex-col overflow-hidden">
               {/* Đưa text label ra một thanh header riêng thay vì overlay đè lên model */}
               <div className="bg-slate-800 border-b border-slate-700 text-slate-300 px-3 py-2 text-xs font-semibold z-10 w-full flex justify-between">
                 <span>3D Preview</span>
                 <span className="text-slate-400 font-mono">{selectedDoll.sku}</span>
               </div>
               
               <div className="flex-1 w-full relative">
                 {selectedDoll.modelUrl ? (
                   <AvatarRenderer 
                     lipsSyncEngine={null}
                     animationTag="idle"
                     modelUrl={selectedDoll.modelUrl}
                     cameraPosition={[0, 0, 4.5]} // Đẩy camera ra xa để thấy toàn thân
                   />
                 ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                     Không có model 3D
                   </div>
                 )}
               </div>
             </div>
          ) : (
            <div className="bg-gray-50 rounded border border-gray-200 border-dashed h-full flex flex-col items-center justify-center text-gray-400">
              <QrCode size={48} className="mb-4 text-gray-300" />
              <p className="text-center px-4">Chọn một mẫu búp bê để xem</p>
            </div>
          )}
        </div>

        {/* Col 2 & 3: Tokens for selected Doll */}
        <div className="lg:col-span-5 flex flex-col h-[calc(100vh-140px)]">
          {selectedDoll ? (
            <div className="bg-white rounded shadow-sm border border-gray-200 flex flex-col h-full">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Danh sách Token</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Khu vực: {selectedDoll.region}</p>
                </div>
                
                <form onSubmit={handleGenerate} className="flex gap-2">
                  <input 
                    type="number" 
                    min="1" max="100" 
                    value={generateCount} 
                    onChange={e => setGenerateCount(Number(e.target.value))}
                    className="border border-gray-300 rounded px-2 py-1 w-16 text-sm outline-none focus:border-indigo-500" 
                    title="Số lượng token tạo thêm"
                  />
                  <button 
                    type="submit" 
                    disabled={generating}
                    className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 font-medium whitespace-nowrap"
                  >
                    {generating ? 'Đang tạo...' : '+ Tạo mã'}
                  </button>
                </form>
              </div>

              {/* Search Box */}
              <div className="px-4 py-3 border-b border-gray-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm chuỗi token..." 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Tokens List */}
              <div className="flex-1 p-0 overflow-y-auto bg-white">
                {loadingTokens ? (
                  <div className="text-center p-8 text-gray-400">Đang tải danh sách token...</div>
                ) : currentTokens.length === 0 ? (
                  <div className="text-center p-8 text-gray-400">Không tìm thấy token nào.</div>
                ) : (
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 bg-gray-50/50">
                        <th className="p-3 font-semibold">Token / QR String</th>
                        <th className="p-3 font-semibold">Trạng thái</th>
                        <th className="p-3 font-semibold hidden md:table-cell">Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      {currentTokens.map(t => (
                        <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="bg-white p-1 rounded border border-gray-200 flex-shrink-0">
                                <QRCodeSVG id={`qr-${t.id}`} value={t.token} size={40} includeMargin={true} />
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="font-mono text-xs font-medium text-gray-900">{t.token}</span>
                                <button 
                                  onClick={() => downloadQR(t.id, t.token)}
                                  className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors w-fit"
                                >
                                  <Download size={14} /> Tải ảnh QR
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            {t.status === 'available' && <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs font-semibold"><CheckCircle size={12}/> Có sẵn</span>}
                            {t.status === 'used' && <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-0.5 rounded text-xs"><AlertCircle size={12}/> Đã dùng</span>}
                            {t.status === 'expired' && <span className="inline-flex items-center gap-1 text-red-500 bg-red-50 px-2 py-0.5 rounded text-xs"><AlertCircle size={12}/> Hết hạn</span>}
                          </td>
                          <td className="p-3 text-gray-500">{new Date(t.generatedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredTokens.length > itemsPerPage && (
                <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm">
                  <span className="text-gray-500">
                    Hiển thị {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTokens.length)} trong {filteredTokens.length} tokens
                  </span>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-100"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-2">Trang {currentPage} / {totalPages}</span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded border border-gray-300 disabled:opacity-50 hover:bg-gray-100"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 rounded border border-gray-200 border-dashed h-[calc(100vh-140px)] flex flex-col items-center justify-center text-gray-400">
              <QrCode size={48} className="mb-4 text-gray-300" />
              <p>Vui lòng chọn một mẫu búp bê ở danh sách bên phải</p>
            </div>
          )}
        </div>

        {/* Col 4: Doll List */}
        <div className="lg:col-span-3 flex flex-col h-[calc(100vh-140px)]">
          <div className="bg-white rounded border-t-4 border-indigo-600 shadow-sm h-full flex flex-col">
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">Các loại búp bê</h3>
              <button onClick={fetchDolls} className="text-gray-400 hover:text-indigo-600 transition-colors p-1"><RefreshCw size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="flex justify-center p-4"><RefreshCw className="animate-spin text-gray-400" /></div>
              ) : dolls.length === 0 ? (
                <div className="text-center p-4 text-gray-500 text-sm">Chưa có sản phẩm Búp bê nào.</div>
              ) : dolls.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setSelectedDoll(d); fetchTokens(d.id); }}
                  className={`w-full text-left p-3 rounded border transition-all ${selectedDoll?.id === d.id ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' : 'bg-white border-gray-200 hover:border-indigo-200 hover:bg-gray-50 text-gray-700'}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-sm">{d.sku || 'N/A'}</span>
                    <span className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">{d.region}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-500">Tổng: <strong className="text-gray-800">{d.tokens?.total || 0}</strong></span>
                    <span className="text-green-600">Mới: <strong>{d.tokens?.unused || 0}</strong></span>
                    <span className="text-gray-400">Đã dùng: {d.tokens?.used || 0}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
