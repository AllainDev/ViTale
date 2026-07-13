import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useLanguage } from '../context/LanguageContext';
import { getTranslation } from '../lib/i18n';

interface QRScannerProps {
  onScanSuccess: (code: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScanSuccess, onClose }: QRScannerProps) {
  const { language } = useLanguage();
  const dict = getTranslation(language);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let isScanned = false;
    
    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          async (decodedText) => {
            if (mounted && !isScanned) {
              isScanned = true; // prevent multiple triggers
              try {
                await html5QrCode.stop();
                html5QrCode.clear();
              } catch (e) {
                console.error("Error stopping scanner", e);
              }
              onScanSuccess(decodedText);
            }
          },
          (errorMessage) => {
            // ignore continuous scanning errors
          }
        );
        
        // If unmounted while starting, stop immediately
        if (!mounted) {
          try {
            if (html5QrCode.getState() === 2) {
              await html5QrCode.stop();
            }
            html5QrCode.clear();
          } catch (e) {
            // ignore cleanup errors
          }
        }
      } catch (err) {
        if (mounted) {
          console.error("Failed to start QR scanner", err);
          setErrorMsg("Trình duyệt đang chặn quyền Camera. Vui lòng bấm vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ, bật quyền Camera và tải lại trang.");
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      try {
        if (scannerRef.current) {
          const state = scannerRef.current.getState();
          if (state === 2) { // 2 = SCANNING
            scannerRef.current.stop().then(() => {
              scannerRef.current?.clear();
            }).catch(console.error);
          } else {
             scannerRef.current.clear();
          }
        }
      } catch (e) {
        console.error("Cleanup stop error", e);
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-sm aspect-[3/4] bg-stone-900 rounded-2xl overflow-hidden border border-stone-700 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-stone-900/90 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">{dict.qrScanner.title}</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-stone-800 hover:bg-stone-700 rounded-full text-stone-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Area */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {errorMsg ? (
            <div className="text-red-400 p-4 text-center text-sm">{errorMsg}</div>
          ) : (
            <div id="qr-reader" className="w-full h-full [&>video]:object-cover" />
          )}

          {/* Scanner Overlay UI */}
          {!errorMsg && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-64 border-2 border-emerald-500/50 rounded-xl">
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
                
                {/* Laser Line */}
                <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.5)] animate-[scan_2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-stone-900 text-center z-10">
          <p className="text-stone-400 text-xs leading-relaxed">
            {dict.qrScanner.instruction}
          </p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #qr-reader__scan_region {
          min-height: 100% !important;
        }
        #qr-reader__dashboard_section_csr span, #qr-reader__dashboard_section_csr button {
          display: none !important;
        }
        #qr-reader__dashboard_section_swaplink {
          display: none !important;
        }
      `}} />
    </div>
  );
}
