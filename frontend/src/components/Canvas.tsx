'use client';
import React, { useState, useEffect, useRef } from "react";
import { ActiveScreen, ViewMode, HeritageNode, HeritageEdge } from "../types";
import { ALL_PRODUCTS } from "../data";
import { useLanguage } from "../context/LanguageContext";
import { getTranslation } from "../lib/i18n";
import { useRouter } from 'next/navigation';
import { gamificationApi } from "../lib/api";
import PassportView from './PassportView';

import {
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  QrCode,
  Send,
  User,
  CheckCircle,
  Lock,
  Star,
  Coffee,
  Bot,
  Sparkles,
  LogOut,
  Layers,
  Search,
  Check,
  Compass,
  ShieldCheck,
  Award,
  ChevronRight
} from "lucide-react";
import QRScanner from "./QRScanner";
import { useAuth } from "../context/AuthContext";
import GoogleLoginButton from "./auth/GoogleLoginButton";
import FacebookLoginButton from "./auth/FacebookLoginButton";
import { AvatarStage } from "./Chat/AvatarStage";
import { GlassChatPanel } from "./Chat/GlassChatPanel";

const translateAuthError = (err: string, lang: string) => {
  if (lang !== 'vi' || !err) return err;
  const map: Record<string, string> = {
    "Email is required": "Vui lòng nhập địa chỉ email.",
    "Invalid email format": "Định dạng email không hợp lệ.",
    "Email is too long": "Địa chỉ email quá dài.",
    "Password is required": "Vui lòng nhập mật khẩu.",
    "Password must be at least 8 characters": "Mật khẩu phải có ít nhất 8 ký tự.",
    "Password must contain at least one uppercase letter": "Mật khẩu phải chứa ít nhất 1 chữ in hoa.",
    "Password must contain at least one lowercase letter": "Mật khẩu phải chứa ít nhất 1 chữ thường.",
    "Password must contain at least one number": "Mật khẩu phải chứa ít nhất 1 chữ số.",
    "Password must not contain spaces": "Mật khẩu không được chứa dấu cách.",
    "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)": "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.",
    "Password must contain at least one special character": "Mật khẩu phải chứa ít nhất 1 ký tự đặc biệt.",
    "Full name is required": "Vui lòng nhập họ và tên.",
    "Full name must be at least 2 characters": "Họ và tên phải có ít nhất 2 ký tự.",
    "Full name is too long": "Họ và tên quá dài.",
    "Invalid email format or disposable email not allowed": "Email không hợp lệ hoặc không được dùng email ảo.",
    "Email domain does not exist": "Tên miền email không tồn tại.",
    "Email already registered": "Email này đã được đăng ký từ trước.",
    "Invalid email or password": "Email hoặc mật khẩu không chính xác.",
    "Account is locked. Please contact support.": "Tài khoản đang bị khóa. Vui lòng liên hệ CSKH.",
    "Please verify your email before logging in": "Vui lòng xác thực email trước khi đăng nhập."
  };
  return map[err] || err;
};

interface CanvasProps {
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;
  nodes: HeritageNode[];
  edges: HeritageEdge[];
  setNodes: React.Dispatch<React.SetStateAction<HeritageNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<HeritageEdge[]>>;
  prices: Record<string, string>;
  brandTheme: any;
  onSimulateQrScan: () => void;
}

export default function Canvas({
  activeScreen,
  setActiveScreen,
  nodes,
  edges,
  setNodes,
  setEdges,
  prices,
  brandTheme,
  onSimulateQrScan
}: CanvasProps) {
  const router = useRouter();
  // Local active states for filters inside Collections screen
  const [selectedRegion, setSelectedRegion] = useState<string>("All");
  const [selectedMaterial, setSelectedMaterial] = useState<string>("All");

  // Local state for contact form
  const [contactForm, setContactForm] = useState({ name: "", email: "", type: "general", message: "" });
  const [contactSubmitted, setContactSubmitted] = useState(false);

  // Local state for auth screen toggling (Login vs Register)
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  
  // Email Auth Form States
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  
  // User Authentication State
  const { user, logout, setJwt } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const isProcessingQR = useRef(false);

  // Profile Edit States
  const [profileFullName, setProfileFullName] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileHasPassword, setProfileHasPassword] = useState(true);
  const [updateProfileMessage, setUpdateProfileMessage] = useState({ text: "", type: "" });
  const [changePasswordMessage, setChangePasswordMessage] = useState({ text: "", type: "" });
  const [profileLoading, setProfileLoading] = useState(false);

  // Initialize Profile data
  useEffect(() => {
    if (activeScreen === "profile" && user) {
      setProfileFullName(""); // reset to prevent flash of old name
      const fetchProfile = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
          const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
          const res = await fetch(`${baseUrl}/auth/profile`, {
            credentials: 'include',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('vitale_jwt')}` }
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            setProfileFullName(data.fullName || user.email.split('@')[0]);
            setProfileHasPassword(data.hasPassword !== false);
          } else if (res.status === 401) {
            // Backend cookie expired or invalid, auto logout to clear bad state
            logout();
            setAuthError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
            setActiveScreen("auth");
            setAuthMode("login");
          }
        } catch (e) {
          setProfileFullName(user.email.split('@')[0]);
        }
      };
      fetchProfile();
    }
  }, [activeScreen, user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setUpdateProfileMessage({ text: "", type: "" });
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
      const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
      const res = await fetch(`${baseUrl}/auth/profile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vitale_jwt')}`
        },
        body: JSON.stringify({ fullName: profileFullName })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let errorMessage = data.error;
        if (!errorMessage && data.errors && typeof data.errors === 'object') {
          const firstKey = Object.keys(data.errors)[0];
          if (firstKey && Array.isArray(data.errors[firstKey]) && data.errors[firstKey].length > 0) {
            errorMessage = data.errors[firstKey][0];
          }
        }
        const finalError = translateAuthError(errorMessage, currentLanguage);
        throw new Error(finalError || t.profile_alt?.authError || "Lỗi");
      }
      setUpdateProfileMessage({ text: t.profile_alt?.infoUpdated || "Cập nhật thành công", type: "success" });
      if (data.token) {
        setJwt(data.token);
        localStorage.setItem('vitale_jwt', data.token);
      }
    } catch (err: any) {
      setUpdateProfileMessage({ text: err.message || t.profile_alt?.authError || "Lỗi", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileCurrentPassword || !profileNewPassword) {
      setChangePasswordMessage({ text: t.profile_alt?.passwordRequired || "Vui lòng nhập mật khẩu", type: "error" });
      return;
    }
    setProfileLoading(true);
    setChangePasswordMessage({ text: "", type: "" });
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
      const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
      const res = await fetch(`${baseUrl}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vitale_jwt')}`
        },
        body: JSON.stringify({ currentPassword: profileCurrentPassword, newPassword: profileNewPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let errorMessage = data.error;
        if (!errorMessage && data.errors && typeof data.errors === 'object') {
          const firstKey = Object.keys(data.errors)[0];
          if (firstKey && Array.isArray(data.errors[firstKey]) && data.errors[firstKey].length > 0) {
            errorMessage = data.errors[firstKey][0];
          }
        }
        const finalError = translateAuthError(errorMessage, currentLanguage);
        throw new Error(finalError || t.profile_alt?.authError || "Lỗi");
      }
      setChangePasswordMessage({ text: t.profile_alt?.passwordUpdated || "Đổi mật khẩu thành công", type: "success" });
      setProfileCurrentPassword("");
      setProfileNewPassword("");
    } catch (err: any) {
      setChangePasswordMessage({ text: err.message || t.profile_alt?.authError || "Lỗi", type: "error" });
    } finally {
      setProfileLoading(false);
    }
  };

  // Email Auth Handler
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (authMode === 'register' && !authFullName.trim()) {
      setAuthError(currentLanguage === 'vi' ? "Vui lòng nhập họ và tên." : "Please enter your full name.");
      return;
    }
    if (!authEmail) {
      setAuthError(currentLanguage === 'vi' ? "Vui lòng nhập địa chỉ email." : "Please enter your email address.");
      return;
    }
    if (!authPassword) {
      setAuthError(currentLanguage === 'vi' ? "Vui lòng nhập mật khẩu." : "Please enter your password.");
      return;
    }

    setAuthLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
      const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = authMode === 'login' 
        ? { email: authEmail.trim(), password: authPassword }
        : { email: authEmail.trim(), password: authPassword, fullName: authFullName.trim() };

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        let errorMessage = data.error;
        // Extract FluentValidation errors if data.error is empty
        if (!errorMessage && data.errors && typeof data.errors === 'object') {
          const firstKey = Object.keys(data.errors)[0];
          if (firstKey && Array.isArray(data.errors[firstKey]) && data.errors[firstKey].length > 0) {
            errorMessage = data.errors[firstKey][0];
          }
        }

        const finalError = translateAuthError(errorMessage, currentLanguage) || (authMode === 'login' ? t.auth.loginError : t.auth.registerError);
        setAuthError(finalError);
        setAuthLoading(false);
        return;
      }

      if (authMode === 'login' && data.token) {
        setJwt(data.token);
        localStorage.setItem('vitale_jwt', data.token);
        if (data.user) {
          setProfileFullName(data.user.fullName);
          setProfileHasPassword(data.user.hasPassword);
        }
        setAuthSuccess("Đăng nhập thành công");
        setAuthEmail("");
        setAuthPassword("");
        setAuthError("");
        setActiveScreen('profile');
      } else if (authMode === 'register') {
        setAuthSuccess(t.auth.registerSuccess);
        setAuthMode("login");
        setAuthError("");
        setAuthEmail("");
        setAuthPassword("");
        setAuthFullName("");
      }
    } catch (err) {
      setAuthError("Lỗi kết nối mạng. Vui lòng thử lại sau.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Collections from API
  const [apiProducts, setApiProducts] = useState<any[]>([]);
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
    const baseUrl = apiUrl.endsWith('/api/v1') ? apiUrl : `${apiUrl}/api/v1`;
    fetch(`${baseUrl}/collections`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setApiProducts(data); })
      .catch(() => {}); // Fallback to static data silently
  }, []);
  const products = apiProducts.length > 0 ? apiProducts : ALL_PRODUCTS;

  const { language: currentLanguage, setLanguage: setCurrentLanguage } = useLanguage();
  
  // 3D Assistant State
  const [animTag, setAnimTag] = useState<'idle' | 'talking'>('idle');
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  // Local state for chat message list
  const [chatBlocked, setChatBlocked] = useState(false);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (activeScreen === "assistant" && user) {
      gamificationApi.getStatus().then(status => {
        if (!status.ownedDolls || status.ownedDolls.length === 0) {
          setChatBlocked(true);
        } else {
          setChatBlocked(false);
        }
      }).catch(() => {
        setChatBlocked(true);
      });
    }
  }, [activeScreen, user, currentLanguage]);

  // Scroll to top whenever the active screen changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeScreen]);

  // Chat state moved to ChatContext; Canvas only handles blocking + avatar animation.

  // Handle Product activation (Simulate QR/Tag scan)
  const handleActivatePassport = (nodeId: string, itemName: string) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return { ...node, status: "unlocked" };
      }
      return node;
    }));
    
    setEdges(prev => prev.map(edge => {
      if (edge.source === nodeId || edge.target === nodeId) {
        return { ...edge, status: "active" };
      }
      return edge;
    }));

    triggerToast(`✨ Hoan hô! Kích hoạt Hộ chiếu AI thành công cho "${itemName}". Điểm đến ${nodeId.toUpperCase()} đã được mở khóa trên bản đồ di sản!`);
  };

  // Contact form submission
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email) {
      triggerToast("Vui lòng điền đầy đủ Họ tên và Email!");
      return;
    }
    setContactSubmitted(true);
    triggerToast(`📬 Gửi yêu cầu thành công! Cảm ơn bạn ${contactForm.name}, VITALE sẽ phản hồi tới bạn qua mail trong vòng 24h.`);
    setTimeout(() => {
      setContactForm({ name: "", email: "", type: "general", message: "" });
      setContactSubmitted(false);
    }, 5000);
  };

  const t = getTranslation(currentLanguage as any);

  const unlockedCount = nodes.filter(n => n.status === "unlocked").length;

  return (
    <div 
      className="w-full min-h-screen flex flex-col relative"
      style={{ backgroundColor: brandTheme.backgroundColor }}
    >
      
      {/* Dynamic Toast Feedback Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-6 bg-emerald-900 border border-emerald-500 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl z-50 max-w-sm animate-bounce flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-semibold leading-normal">{toastMessage}</span>
        </div>
      )}

      {/* VITALE HEADER NAVBAR */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200/60 py-3.5 px-6 sticky top-0 z-30 flex flex-col md:flex-row justify-between items-center gap-3 transition-all">
        <div className="flex justify-between items-center w-full md:flex-1 md:justify-start">
          <button 
            onClick={() => setActiveScreen("home")}
            className="font-serif text-2xl tracking-widest font-black cursor-pointer hover:opacity-85 transition-opacity"
            style={{ color: brandTheme.primaryColor }}
          >
            {t.brandName}
          </button>
          
          {/* Mobile Lang & Auth togglers next to logo */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setCurrentLanguage(currentLanguage === "vi" ? "en" : "vi")}
              className="relative flex items-center bg-stone-100 rounded-full p-0.5 w-[56px] h-[24px] cursor-pointer hover:bg-stone-200 transition-colors border border-stone-200"
            >
              <div className={`absolute w-[26px] h-[20px] bg-white rounded-full shadow-sm transition-transform duration-300 ${currentLanguage === 'en' ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
              <div className="absolute inset-0 flex justify-between items-center px-1.5 text-[9px] font-bold font-mono tracking-wider text-stone-600 pointer-events-none">
                <span className={currentLanguage === 'vi' ? 'text-stone-900 z-10' : 'text-stone-400 z-10'}>VI</span>
                <span className={currentLanguage === 'en' ? 'text-stone-900 z-10' : 'text-stone-400 z-10'}>EN</span>
              </div>
            </button>
            {user?.isRegistered ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-stone-800 bg-white pl-1 pr-3 py-1 rounded-full border border-stone-200"
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt="Avatar" className="w-6 h-6 rounded-full object-cover ring-1 ring-amber-200" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-serif font-black text-[10px]">
                      {user.email[0].toUpperCase()}
                    </div>
                  )}
                  {user.email.split('@')[0].substring(0, 8)}
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-50">
                    <div className="px-4 py-3 bg-gradient-to-br from-amber-50 to-stone-100 border-b border-stone-100">
                      <p className="text-sm font-bold text-stone-800 truncate">{user.email.split('@')[0]}</p>
                      <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                    </div>
                    <div className="py-1">
                      <button
                        onClick={() => { setActiveScreen("profile"); setProfileMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
                      >
                        <User size={13} className="text-amber-600" />Hồ sơ của tôi
                      </button>

                      {user?.isRegistered && (
                        <button 
                          onClick={() => { 
                            setShowQRScanner(true); 
                            setProfileMenuOpen(false); 
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 transition-colors flex items-center gap-2"
                        >
                          <QrCode size={13} className="text-emerald-600" />Quét QR búp bê
                        </button>
                      )}
                      <div className="h-px bg-stone-100 mx-3" />
                      <button 
                        onClick={() => { logout(); setProfileMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                      >
                        <LogOut size={13} className="text-red-400" />{t.profile_alt?.logout || "Đăng xuất"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                  setAuthSuccess("");
                  setActiveScreen("auth");
                }}
                className="shrink-0 text-[10px] tracking-wider uppercase font-bold text-white h-[28px] w-28 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: brandTheme.primaryColor }}
              >
                {t.login}
              </button>
            )}
          </div>
        </div>

        {/* Navigation list: Responsive scaling */}
        <nav className="flex items-center gap-1 sm:gap-2 lg:gap-4 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 justify-start md:justify-center px-2 md:px-0 scrollbar-hide">
          {[
            { id: "home", label: t.navHome },
            { id: "collections", label: t.navCollections },
            { id: "passport", label: t.navPassport },
            { id: "assistant", label: t.navAssistant },
            { id: "contact", label: t.navContact },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id as ActiveScreen)}
              className="text-[10px] md:text-xs tracking-wider uppercase font-bold py-1 px-2 md:px-3 transition-all relative shrink-0 flex items-center gap-1"
              style={{
                color: activeScreen === item.id ? brandTheme.secondaryColor : "#424843"
              }}
            >
              <span>{item.label}</span>
              {(item.id === 'assistant') && !user?.isRegistered && (
                <Lock size={9} className="text-stone-400" />
              )}
              {activeScreen === item.id && (
                <span 
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ backgroundColor: brandTheme.secondaryColor }}
                />
              )}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2 lg:gap-4 md:flex-1 md:justify-end shrink-0">
          <button
            onClick={() => setCurrentLanguage(currentLanguage === "vi" ? "en" : "vi")}
            className="shrink-0 relative flex items-center bg-stone-100 rounded-full p-1 w-[68px] h-[28px] cursor-pointer hover:bg-stone-200 transition-colors border border-stone-200"
          >
            <div className={`absolute w-[30px] h-[22px] bg-white rounded-full shadow-sm transition-transform duration-300 ${currentLanguage === 'en' ? 'translate-x-[28px]' : 'translate-x-0'}`}></div>
            <div className="absolute inset-0 flex justify-between items-center px-2 text-[10px] font-bold font-mono tracking-wider text-stone-600 pointer-events-none">
              <span className={currentLanguage === 'vi' ? 'text-stone-900 z-10' : 'text-stone-400 z-10'}>VI</span>
              <span className={currentLanguage === 'en' ? 'text-stone-900 z-10' : 'text-stone-400 z-10'}>EN</span>
            </div>
          </button>
          
          {user?.isRegistered ? (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-2 text-xs font-bold text-stone-800 bg-white pl-1.5 pr-4 py-1.5 rounded-full border border-stone-200 transition-all hover:shadow-md hover:border-stone-300"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-7 h-7 rounded-full object-cover ring-2 ring-amber-200" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-serif font-black text-xs">
                    {user.email[0].toUpperCase()}
                  </div>
                )}
                <span className="max-w-[80px] truncate">{user.email.split('@')[0]}</span>
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-50">
                  {/* Profile header */}
                  <div className="px-4 py-4 bg-gradient-to-br from-amber-50 to-stone-100 border-b border-stone-100">
                    <div className="flex items-center gap-3">
                      {user.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="w-11 h-11 rounded-full object-cover ring-2 ring-amber-300" />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-amber-700 flex items-center justify-center text-white font-serif font-black text-base">
                          {user.email[0].toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-stone-800 truncate">{user.email.split('@')[0]}</p>
                        <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                          <ShieldCheck size={9} /> {t.profile_alt?.verified}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Menu items */}
                  <div className="py-1">
                    <button 
                      onClick={() => { setActiveScreen("profile" as ActiveScreen); setProfileMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2"><User size={14} className="text-amber-600" />{t.profile_alt?.accountInfo || "Hồ sơ của tôi"}</span>
                      <ChevronRight size={14} className="text-stone-300" />
                    </button>

                    {user?.isRegistered && (
                      <button 
                        onClick={() => { setShowQRScanner(true); setProfileMenuOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2"><QrCode size={14} className="text-emerald-600" />Quét QR búp bê</span>
                        <ChevronRight size={14} className="text-stone-300" />
                      </button>
                    )}
                    <div className="h-px bg-stone-100 mx-3" />
                    <button 
                      onClick={() => { logout(); setProfileMenuOpen(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <LogOut size={14} className="text-red-400" />
                      {t.profile_alt?.logout || "Đăng xuất"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
                setAuthSuccess("");
                setActiveScreen("auth");
              }}
              className="shrink-0 text-xs tracking-wider uppercase font-bold text-white h-9 w-32 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: brandTheme.primaryColor }}
            >
              {t.login}
            </button>
          )}
        </div>
      </header>

        {/* Outer content container inside preview window */}
        <div className="flex-1 scroll-smooth">
          
          {/* ========================================================= */}
          {/* SCREEN 1: HOME PAGE (Màn hình 6)                          */}
          {/* ========================================================= */}
          {activeScreen === "home" && (
            <div className="animate-fadeIn">
              
              {/* Hero Banner Section */}
              <section className="px-6 md:px-12 py-10 md:py-16 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <h1 
                    className="font-serif text-3xl md:text-5xl font-black leading-tight tracking-tight"
                    style={{ color: brandTheme.primaryColor }}
                  >
                    Touch the heritage, <br />
                    <span className="italic" style={{ color: brandTheme.secondaryColor }}>Awakened by algorithms.</span>
                  </h1>
                  <p className="text-stone-600 text-sm md:text-base leading-relaxed">
                    {t.subSlogan}
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => setActiveScreen('passport')}
                      className="w-full sm:w-52 lg:w-60 h-12 rounded-full text-xs font-semibold text-white shadow-lg flex items-center justify-center gap-2 hover:scale-102 active:scale-98 transition-all shrink-0"
                      style={{ backgroundColor: brandTheme.primaryColor }}
                    >
                      <span>{t.unlockBtn}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setActiveScreen('collections')}
                      className="w-full sm:w-52 lg:w-60 h-12 rounded-full text-xs font-semibold border-2 transition-all hover:bg-stone-50 text-stone-700 flex items-center justify-center hover:scale-102 active:scale-98 shrink-0"
                      style={{ borderColor: brandTheme.secondaryColor }}
                    >
                      {t.exploreBtn}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="rounded-2xl overflow-hidden border border-stone-200/80 shadow-2xl bg-stone-100 aspect-[4/5] relative">
                    <img 
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBA-dKLrc-tdk9u6osZMofB7crV6owSArYWfahxJRQz2V6eLseyhfRWz--4wl6GftO523bOKlgdiepPbSJOCSr3mWi1nW0jR9ApSD1QsPUdmX1RKiaoGMo2fE5YBsyjr_oK8aMzSO_9iZfOwJan98SGYYbnWk8a2tb0chn6d-dgojWBTq5mJRzwPwe7so1WFszYkOxRQfEInIzvCcryEdu5Xo5mkzVVWXTuHO14bdg0_7RlkCDIpLOtWA" 
                      alt="Crochet Doll Hero" 
                      className="w-full h-full object-cover"
                    />
                    {/* Floating badge */}
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm border text-[10px] font-bold uppercase py-1.5 px-3 rounded-full flex items-center gap-1.5 shadow-md"
                         style={{ color: brandTheme.secondaryColor, borderColor: brandTheme.secondaryColor }}>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Zero-Waste Packaging
                    </div>
                  </div>
                </div>
              </section>

              {/* Core Values / ESG Rows */}
              <section className="bg-stone-100/50 py-12 px-6 border-y border-stone-200/40">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-6 rounded-xl border border-stone-200/50 space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif font-bold text-stone-800 text-sm">Physical-to-Digital</h3>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Seamlessly transition from tactile craftsmanship to digital exploration through integrated smart tags.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-stone-200/50 space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-800">
                      <Compass className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif font-bold text-stone-800 text-sm">Gamified Culture</h3>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Unlock rich cultural stories and heritage artifacts as you journey through curated interactive narratives.
                    </p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-stone-200/50 space-y-3 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-800">
                      <Bot className="w-5 h-5" />
                    </div>
                    <h3 className="font-serif font-bold text-stone-800 text-sm">Proactive AI Guide</h3>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      Receive personalized Michelin recommendations and bespoke travel itineraries tailored to your pace.
                    </p>
                  </div>
                </div>
              </section>

              {/* Artisanal Artifacts Grid */}
              <section className="px-6 md:px-12 py-12">
                <div className="flex justify-between items-end mb-8">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest block mb-1" style={{ color: brandTheme.secondaryColor }}>
                      Hanoi Collection
                    </span>
                    <h2 className="font-serif text-2xl font-black" style={{ color: brandTheme.primaryColor }}>
                      {t.artisanalTitle}
                    </h2>
                  </div>
                  <button 
                    onClick={() => setActiveScreen("collections")}
                    className="text-xs font-bold hover:underline flex items-center gap-1.5"
                    style={{ color: brandTheme.secondaryColor }}
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {/* Item 1: Crochet Heritage Doll */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden flex flex-col group shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="aspect-square bg-stone-50 relative overflow-hidden">
                      <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBLbsUJJHJf6fFCamOHj56yiZbVNNMxY7XT8Y8zx3ugcLUx_wwUUo0oDgNL2X44WOiuBUMzCqJ64PkEkHVz3SfKnI5aDLun8nu0rgadQyFoeQ_wu0TdgIC9aecQJwVMsLJbiTqRLxVRy7V7HQfwkmpEKR8OVquGpwBqOTFdbSTbdsOitOUjV3-tNtUUH5W7KHbwS1aPbi5fBLLMOVO6249BACsc3E_en2xlzEC66tPYXNzA4SQEF-huRw" 
                        alt="Crochet Doll" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                      <span className="absolute top-3 left-3 bg-white/95 text-[9px] font-bold uppercase px-2 py-1 rounded-full border border-dashed border-stone-300">
                        100% Organic
                      </span>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1 mb-1">
                          <h3 className="font-serif font-black text-stone-800 text-sm line-clamp-1">Crochet Heritage Doll</h3>
                          <span className="text-xs font-bold font-mono text-stone-500 whitespace-nowrap">{prices["doll"] || "₫850,000"}</span>
                        </div>
                        <p className="text-xs text-stone-500 line-clamp-2">Hand-woven representation of traditional northern attire, crafted with zero-waste principles.</p>
                      </div>

                    </div>
                  </div>

                  {/* Item 2: Handmade Passport Cover */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden flex flex-col group shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="aspect-square bg-stone-50 relative overflow-hidden">
                      <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsRmuef2oH4srUsQl77SBfVt3ZjPSJoP3fr3Wsr-JyWvmZMG_CmLW8SXUo5kfXP__U9GPvajLkirusOq7YMmgf4mi9kBi9vERj9uSidn3UBLLVTERE0UnGUx4GLlPS0Gj3mRVCTLTb9YXGBzP3WvDQk2i7hG34g-AcOxZLHdIOl4dY7Y7xDq_VF_8zxX79BM_WMfGpUiNMNAoGaofxgQ97R0CVzST0EYgSaPlwf3Hz-cXY-UnpWZgLuw" 
                        alt="Passport Cover" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1 mb-1">
                          <h3 className="font-serif font-black text-stone-800 text-sm line-clamp-1">Handmade Passport Cover</h3>
                          <span className="text-xs font-bold font-mono text-stone-500 whitespace-nowrap">{prices["passport-cover"] || "₫450,000"}</span>
                        </div>
                        <p className="text-xs text-stone-500 line-clamp-2">Linen and pressed rice paper cover to protect your physical and digital memories.</p>
                      </div>

                    </div>
                  </div>

                  {/* Item 3: Custom Commemorative Keepsake */}
                  <div className="bg-white rounded-2xl border border-stone-200/80 overflow-hidden flex flex-col group shadow-sm hover:shadow-lg transition-all duration-300">
                    <div className="aspect-square bg-stone-50 relative overflow-hidden">
                      <img 
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk3jlqdfqWIWF_6cyp6KQigFgz4Dw208rFdgN-KTeAegaaKFuwXIvKVlBIrTOS3whxvXY9rBzGDD_KLJRpFo9ILvYTX7w2aq0hk7LjKt90NFg7Fe9_-U7TbsVymDSpVYp6op9gqkkuIVzASYOEAN6B8a8JmBfoF2mhsgH00NYCjEErWLGBFZVLblOK0QP5qZXHaUREtnzjwBE8WVXpevvZJnVlLOm8CjKzLZeisZCE6h2fzDhZCHnv_Q" 
                        alt="Keepsake Box" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-1 mb-1">
                          <h3 className="font-serif font-black text-stone-800 text-sm line-clamp-1">Custom Keepsake Box</h3>
                          <span className="text-xs font-bold font-mono text-stone-500 whitespace-nowrap">Contact</span>
                        </div>
                        <p className="text-xs text-stone-500 line-clamp-2">Curated heritage selections designed for meaningful personal gifting and memories.</p>
                      </div>
                      <button
                        onClick={() => setActiveScreen("contact")}
                        className="w-full mt-4 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        Request a quote
                      </button>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 2: COLLECTIONS PAGE (Màn hình 2)                    */}
          {/* ========================================================= */}
          {activeScreen === "collections" && (
            <div className="p-6 md:p-10 space-y-10 animate-fadeIn">
              
              {/* Header block */}
              <div className="text-center max-w-2xl mx-auto space-y-4">
                <span className="inline-block px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: brandTheme.secondaryColor, borderColor: brandTheme.secondaryColor }}>
                  Artisan Archives
                </span>
                <h1 className="font-serif text-3xl md:text-4xl font-black leading-tight" style={{ color: brandTheme.primaryColor }}>
                  Timeless Craft, Modern Discovery.
                </h1>
                <p className="text-stone-500 text-sm">
                  Explore a curated selection of Vietnamese heritage items. Each artifact tells a story of local craftsmanship, reimagined for the eco-conscious traveler.
                </p>
              </div>

              {/* Region filter removed: collection items are now driven by the
                  admin-managed data via /api/v1/collections. Showing every item
                  below so the storefront always mirrors the admin catalog. */}

              {/* Product list */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {products
                  .map((prod: any) => {
                    const priceVal = prices[prod.id] || prod.price;
                    return (
                      <article 
                        key={prod.id} 
                        className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
                      >
                        <div className="relative h-[240px] bg-stone-50 overflow-hidden">
                          <img 
                            src={prod.image || prod.imageUrl || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'} 
                            alt={prod.title || prod.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          
                          {prod.badge && (
                            <div className="absolute top-3 right-3 bg-emerald-700 text-white px-2.5 py-1 rounded-full text-[9px] font-bold">
                              {prod.badge}
                            </div>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                              <h3 className="font-serif font-bold text-stone-800 text-sm md:text-base leading-tight">
                                {currentLanguage === "vi" ? (prod.vietnameseTitle || prod.name) : (prod.title || prod.name)}
                              </h3>
                              <span className="text-xs md:text-sm font-bold font-mono text-stone-600 shrink-0">{priceVal}</span>
                            </div>
                            <p className="text-xs text-stone-500 leading-relaxed">{prod.desc || prod.description}</p>
                          </div>
                          <button 
                            onClick={() => triggerToast(`✨ ${prod.title || prod.name} — Sản phẩm đang được chuẩn bị đặt hàng!`)}
                            className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 active:scale-98"
                            style={{ backgroundColor: brandTheme.secondaryColor }}
                          >
                            Xem chi tiết
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 3: AI PASSPORT (Màn hình 4) — requires auth         */}
          {/* ========================================================= */}
          {activeScreen === "passport" && !user && (
            <div className="flex flex-col items-center justify-center min-h-[480px] p-10 animate-fadeIn text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                <Lock className="w-9 h-9 text-amber-700" />
              </div>
              <div className="space-y-2 max-w-xs">
                <h2 className="font-serif text-2xl font-bold text-stone-800">Hộ chiếu AI</h2>
                <p className="text-stone-500 text-sm leading-relaxed">Đăng nhập để mở khóa Hộ chiếu AI và theo dõi hành trình khám phá di sản của bạn.</p>
              </div>
              <button
                onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); setActiveScreen("auth"); }}
                className="px-8 py-3 rounded-full text-sm font-bold text-white shadow-lg hover:scale-105 transition-all"
                style={{ backgroundColor: brandTheme.primaryColor }}
              >
                Đăng nhập ngay
              </button>
            </div>
          )}
          {activeScreen === "passport" && user && (
            <PassportView />
          )}

          {/* ========================================================= */}
          {/* SCREEN 4: 3D ASSISTANT CHAT SCREEN (Màn hình 3)            */}
          {/* ========================================================= */}
          {activeScreen === "assistant" && (!user?.isRegistered || chatBlocked) && (
            <div className="flex flex-col items-center justify-center min-h-[480px] p-10 animate-fadeIn text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <Bot className="w-9 h-9 text-emerald-700" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h2 className="font-serif text-2xl font-bold text-stone-800">Trợ lý 3D Tô Nữ</h2>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {!user?.isRegistered 
                    ? "Đăng nhập để trò chuyện cùng Nàng Tô Nữ — trợ lý AI di sản văn hoá Việt Nam của bạn."
                    : "Tài khoản của bạn chưa sở hữu bất kỳ Nhân vật 3D nào. Hãy sưu tầm Búp bê và quét mã QR để mở khóa tính năng Chat nhé!"
                  }
                </p>
              </div>
              <button
                onClick={() => { 
                  if (!user?.isRegistered) {
                    setAuthMode("login"); setActiveScreen("auth");
                  } else {
                    setShowQRScanner(true);
                  }
                }}
                className="px-8 py-3 rounded-full text-sm font-bold text-white shadow-lg hover:scale-105 transition-all"
                style={{ backgroundColor: brandTheme.primaryColor }}
              >
                {!user?.isRegistered ? "Đăng nhập ngay" : "Quét mã QR ngay"}
              </button>
            </div>
          )}
          {activeScreen === "assistant" && user && !chatBlocked && (
            <div className="relative w-full h-[calc(100vh-80px)] min-h-[640px] overflow-hidden animate-fadeIn">

              <GlassChatPanel />

              {/* Companion avatar — small, bottom-right above input bar */}
              <AvatarStage animTag={animTag} onAvatarLoaded={() => setAvatarLoaded(true)} />

            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 5: CONTACT PAGE (Màn hình 1)                        */}
          {/* ========================================================= */}
          {activeScreen === "contact" && (
            <div className="p-6 md:p-10 grid grid-cols-1 md:grid-cols-12 gap-8 animate-fadeIn">
              
              {/* Left Column: Contact details and map */}
              <div className="md:col-span-5 space-y-6">
                <div className="space-y-3">
                  <h1 className="font-serif text-3xl font-black text-stone-800 leading-tight" style={{ color: brandTheme.primaryColor }}>
                    {t.contactTitle}
                  </h1>
                  <p className="text-stone-500 text-xs md:text-sm leading-relaxed">
                    We bridge the gap between ancient traditions and modern eco-conscious exploration. Reach out to collaborate, inquire, or simply share a story from your journey.
                  </p>
                </div>

                <div className="space-y-4 bg-white p-5 rounded-xl border border-stone-200/80 shadow-sm text-xs text-stone-600">
                  <div className="flex items-start gap-3">
                    <Mail className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-stone-800">Email Us</h4>
                      <a href="mailto:hello@vitale.vn" className="hover:underline text-stone-500">hello@vitale.vn</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-stone-800">Call Us</h4>
                      <p className="text-stone-500">+84 24 3824 0000</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-stone-800">Visit Our Office</h4>
                      <p className="text-stone-500">123 Tranquil Lane, Hoan Kiem, Hanoi, Vietnam</p>
                    </div>
                  </div>
                </div>

                {/* Minimalist Map placeholder with image URL */}
                <div className="rounded-xl overflow-hidden border border-stone-200/80 aspect-[16/10] relative bg-stone-100 shadow-sm">
                  <img 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuDwJPCe7b2NUrzKQA06077SFvEoidCMaE8JueIH24Nc7iFA83TbNIOOAZhHXy7tZWGcqwLPjmUtEn3pA1_E9jBGa1FkqyMrV4GoFHrORQlzF75D70I4rJLmKEJun_ZLMpnrG_Q0PKIiXgr46PB6_wVsbUjM7srbtvNACyA3GLH-XojA1PzaC-q96QLjqV_qCCEJCgxwhf0WGBard2eaV8YSGcVeXjtU86LOwM68kNPYIU-orzx8w45Erw" 
                    alt="Hanoi map" 
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white rounded-full p-2.5 shadow-lg border border-stone-200 animate-bounce">
                      <MapPin className="w-5 h-5 text-red-600 fill-red-100" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Inquiry Form card */}
              <div className="md:col-span-7">
                <div className="bg-white rounded-xl border border-stone-200 p-6 md:p-8 shadow-md">
                  <h2 className="font-serif text-lg font-bold text-stone-800 mb-6 border-b pb-2">
                    {t.inquiryTitle}
                  </h2>
                  
                  <form onSubmit={handleContactSubmit} noValidate className="space-y-4 text-xs text-stone-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-bold text-stone-700 block">{t.fullname}</label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder="Nguyen Van A"
                          className="w-full border-b-2 border-stone-200 focus:border-amber-600 py-2 focus:outline-none bg-transparent transition-all"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-stone-700 block">{t.emailAddr}</label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder="you@example.com"
                          className="w-full border-b-2 border-stone-200 focus:border-amber-600 py-2 focus:outline-none bg-transparent transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 block">Inquiry Type</label>
                      <select
                        value={contactForm.type}
                        onChange={(e) => setContactForm({ ...contactForm, type: e.target.value })}
                        className="w-full border-b-2 border-stone-200 focus:border-amber-600 py-2 focus:outline-none bg-transparent"
                      >
                        <option value="general">General Inquiry</option>

                        <option value="press">Press &amp; Media</option>
                        <option value="support">Travel Support</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 block">{t.message}</label>
                      <textarea
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder="How can we weave our stories together?"
                        rows={3}
                        className="w-full border-b-2 border-stone-200 focus:border-amber-600 py-2 focus:outline-none bg-transparent resize-none leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactSubmitted}
                      className="px-6 py-3 rounded-full text-white font-bold tracking-wider transition-all hover:scale-103 active:scale-97 shadow-md flex items-center justify-center gap-1.5 self-start"
                      style={{ backgroundColor: brandTheme.primaryColor }}
                    >
                      <span>{t.sendBtn}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN 6: AUTHENTICATION PAGE (Màn hình 5)                  */}
          {/* ========================================================= */}
          {activeScreen === "auth" && (
            <div className="min-h-[480px] flex items-center justify-center p-6 relative">
              
              {/* Subtle stationery overlay background */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-10"
                style={{ 
                  backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuArR9QwkuswMHklXS9n8-WJ1AQv0c94IkOPyayApl-YSNbz29fX4c01Ta_K-hK4D1ffFz0kH6I6zOkflvdUF_ouqnwlaOE3YvDN5S5G6n_EB3yStIEd9nRc38-K5SyXkxwvA2dIGCnuw6S-RmXbgTJTGxO8itgGOCFIT5-VP6ZRzEDqBLu19Uk0yQ0V2uAvQ4fZQ1ysS7ls0DeB8MCdCkaiCRshzJ0QtWDCMIUZFJp3VsehH-Jh3xhvBA')" 
                }}
              />

              <div className="bg-white rounded-2xl border border-stone-200/80 p-8 max-w-sm w-full shadow-2xl relative z-10 transition-all text-xs text-stone-600 space-y-6">
                
                {/* Auth Mode Tabs */}
                <div className="flex border-b border-stone-100 pb-2">
                  <button 
                    onClick={() => { 
                      setAuthMode("login"); 
                      setAuthError(""); 
                      setAuthSuccess(""); 
                      setAuthEmail(""); 
                      setAuthPassword(""); 
                      setAuthFullName(""); 
                    }}
                    className={`flex-1 text-center font-bold pb-2 transition-colors ${
                      authMode === "login" ? "text-amber-800 border-b-2 border-amber-800" : "text-stone-400"
                    }`}
                    style={{ color: authMode === "login" ? brandTheme.secondaryColor : "#9ca3af", borderColor: brandTheme.secondaryColor }}
                  >
                    {t.auth.loginBtn}
                  </button>
                  <button 
                    onClick={() => { 
                      setAuthMode("register"); 
                      setAuthError(""); 
                      setAuthSuccess(""); 
                      setAuthEmail(""); 
                      setAuthPassword(""); 
                      setAuthFullName(""); 
                    }}
                    className={`flex-1 text-center font-bold pb-2 transition-colors ${
                      authMode === "register" ? "text-amber-800 border-b-2 border-amber-800" : "text-stone-400"
                    }`}
                    style={{ color: authMode === "register" ? brandTheme.secondaryColor : "#9ca3af", borderColor: brandTheme.secondaryColor }}
                  >
                    {t.auth.registerBtn}
                  </button>
                </div>

                <div className="text-center">
                  <h2 className="font-serif text-xl font-bold text-stone-800">
                    {authMode === "login" ? t.auth.welcomeBack : t.auth.joinJourney}
                  </h2>
                  <p className="text-stone-400 mt-1 text-[11px]">
                    {authMode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}
                  </p>
                </div>

                <form onSubmit={handleEmailAuthSubmit} noValidate className="space-y-4">
                  
                  {/* Status Messages */}
                  {authError && (
                    <div className="bg-red-50 text-red-600 p-2 text-[10px] rounded border border-red-200">
                      {authError}
                    </div>
                  )}
                  {authSuccess && (
                    <div className="bg-emerald-50 text-emerald-600 p-2 text-[10px] rounded border border-emerald-200">
                      {authSuccess}
                    </div>
                  )}

                  {/* Social Login Buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <GoogleLoginButton label="Google" />
                    <FacebookLoginButton label="Facebook" />
                  </div>
                  
                  <div className="relative flex items-center py-2 mb-4">
                    <div className="flex-grow border-t border-stone-200"></div>
                    <span className="flex-shrink-0 mx-4 text-stone-400 text-[10px] uppercase font-bold">{t.auth.orUseEmail}</span>
                    <div className="flex-grow border-t border-stone-200"></div>
                  </div>
                  {authMode === "register" && (
                    <div className="space-y-1">
                      <label className="font-bold text-stone-700 block">{t.auth.fullNameLabel}</label>
                      <input 
                        type="text" 
                        required 
                        value={authFullName}
                        onChange={(e) => { setAuthFullName(e.target.value); setAuthError(""); }}
                        placeholder={t.auth.fullNamePlaceholder} 
                        className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 focus:border-amber-600 px-3 py-2 rounded focus:outline-none focus:bg-white text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="font-bold text-stone-700 block">{t.auth.emailLabel}</label>
                    <input 
                      type="email" 
                      required 
                      value={authEmail}
                      onChange={(e) => { setAuthEmail(e.target.value); setAuthError(""); }}
                      placeholder={t.auth.emailPlaceholder} 
                      className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 focus:border-amber-600 px-3 py-2 rounded focus:outline-none focus:bg-white text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-stone-700 block">{t.auth.passwordLabel}</label>
                      {authMode === "login" && (
                        <button 
                          type="button" 
                          onClick={() => router.push('/auth/forgot-password')} 
                          className="text-[10px] text-stone-500 hover:text-amber-700 hover:underline"
                        >
                          {t.auth.forgotPasswordText}
                        </button>
                      )}
                    </div>
                    <input 
                      type="password" 
                      required 
                      value={authPassword}
                      onChange={(e) => { setAuthPassword(e.target.value); setAuthError(""); }}
                      placeholder={t.auth.passwordPlaceholder} 
                      className="w-full bg-stone-50 border-0 border-b-2 border-stone-200 focus:border-amber-600 px-3 py-2 rounded focus:outline-none focus:bg-white text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full text-white font-bold py-3 mt-4 rounded-full transition-all hover:scale-102 active:scale-98 shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: brandTheme.primaryColor }}
                  >
                    {authLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {authMode === "login" ? t.auth.loginBtn : t.auth.registerBtn}
                  </button>
                </form>

                <div className="text-center pt-2">
                  <span className="text-[10px] text-stone-400">
                    {authMode === "login" ? t.auth.noAccount + " " : t.auth.hasAccount + " "}
                    <button 
                      onClick={() => { 
                        setAuthMode(authMode === "login" ? "register" : "login"); 
                        setAuthError(""); 
                        setAuthSuccess(""); 
                        setAuthEmail(""); 
                        setAuthPassword(""); 
                        setAuthFullName(""); 
                      }}
                      className="font-bold hover:underline"
                      style={{ color: brandTheme.secondaryColor }}
                    >
                      {authMode === "login" ? t.auth.registerBtn : t.auth.loginBtn}
                    </button>
                  </span>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* SCREEN: USER PROFILE                                        */}
          {/* ========================================================= */}
          {activeScreen === ("profile" as ActiveScreen) && user && (
            <div className="p-6 md:p-10 animate-fadeIn max-w-2xl mx-auto w-full">
              {/* Profile hero */}
              <div className="bg-gradient-to-br from-amber-50 via-stone-50 to-stone-100 rounded-3xl border border-stone-200 p-8 mb-6 flex flex-col items-center gap-4 shadow-sm">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-amber-200 shadow-lg" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-amber-700 flex items-center justify-center text-white font-serif font-black text-3xl shadow-lg">
                    {user.email[0].toUpperCase()}
                  </div>
                )}
                <div className="text-center">
                  <h1 className="font-serif text-2xl font-black text-stone-800">{profileFullName || user.email.split('@')[0]}</h1>
                  <p className="text-stone-500 text-sm mt-0.5">{user.email}</p>
                </div>
              </div>

              
              {/* Profile Edit Forms */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm">
                  <h2 className="text-lg font-serif font-black text-stone-800 mb-4">{t.profile_alt?.accountInfo || "Cài đặt tài khoản"}</h2>
                  
                  {!user.isRegistered ? (
                    <div className="bg-amber-50 rounded-2xl p-6 text-center">
                      <p className="text-stone-700 font-medium mb-4">
                        Bạn đang sử dụng tài khoản khách. Đăng ký ngay để lưu giữ hành trình và bảo vệ tài sản của bạn!
                      </p>
                      <button
                        onClick={() => { setActiveScreen("auth"); setAuthMode("register"); setProfileMenuOpen(false); }}
                        className="px-6 py-2 bg-amber-600 text-white rounded-full font-bold hover:bg-amber-700 transition-colors"
                      >
                        Đăng ký / Đăng nhập
                      </button>
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleUpdateProfile} noValidate className="space-y-4 mb-8">
                    {updateProfileMessage.text && (
                      <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${updateProfileMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {updateProfileMessage.text}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">{t.profile_alt?.fullName || "Họ và tên"}</label>
                      <input 
                        type="text" 
                        value={profileFullName}
                        onChange={(e) => setProfileFullName(e.target.value)}
                        className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">{t.auth?.emailLabel || "Email"}</label>
                      <input 
                        type="text" 
                        value={user.email}
                        disabled
                        className="w-full px-4 py-3 bg-stone-100 border border-stone-200 rounded-xl text-sm text-stone-500 cursor-not-allowed"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={profileLoading}
                      className="px-6 py-2.5 bg-stone-800 text-white text-sm font-bold rounded-full hover:bg-stone-900 transition-colors disabled:opacity-50"
                    >
                      {profileLoading ? "..." : (t.profile_alt?.updateInfo || "Cập nhật thông tin")}
                    </button>
                  </form>

                  {profileHasPassword && (
                    <>
                      <div className="h-px bg-stone-100 mb-6"></div>

                      <form onSubmit={handleChangePassword} noValidate className="space-y-4">
                        <h3 className="text-sm font-bold text-stone-800 mb-2">{t.profile_alt?.changePassword || "Đổi mật khẩu"}</h3>
                        
                        {changePasswordMessage.text && (
                          <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${changePasswordMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {changePasswordMessage.text}
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">{t.profile_alt?.currentPassword || "Mật khẩu hiện tại"}</label>
                          <input 
                            type="password" 
                            value={profileCurrentPassword}
                            onChange={(e) => setProfileCurrentPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                            placeholder="••••••••"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">{t.profile_alt?.newPassword || "Mật khẩu mới"}</label>
                          <input 
                            type="password" 
                            value={profileNewPassword}
                            onChange={(e) => setProfileNewPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                            placeholder="••••••••"
                          />
                          <p className="text-xs text-stone-500 mt-2">Ít nhất 8 ký tự, bao gồm ít nhất 1 chữ cái và 1 số.</p>
                        </div>
                        <button 
                          type="submit" 
                          disabled={profileLoading}
                          className="px-6 py-2.5 bg-amber-600 text-white text-sm font-bold rounded-full hover:bg-amber-700 transition-colors disabled:opacity-50"
                        >
                          {profileLoading ? "..." : (t.profile_alt?.changePassword || "Đổi mật khẩu")}
                        </button>
                      </form>
                    </>
                  )}
                  </>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Standard VITALE Footer */}
        {activeScreen !== "assistant" && (
          <footer className="bg-stone-100 border-t border-stone-200/80 py-4 px-6 text-[10px] text-stone-500 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="font-serif font-black tracking-widest text-stone-800 text-xs">VITALE</span>
              <span>© 2024 VITALE. Vietnamese Heritage &amp; Eco-conscious Discovery.</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => triggerToast("VITALE: Về chúng tôi / About Us")} className="hover:underline">Về chúng tôi</button>
              <button onClick={() => triggerToast("VITALE: Chính sách bảo mật / Privacy Policy")} className="hover:underline">Chính sách bảo mật</button>
              <button onClick={() => triggerToast("VITALE: Điều khoản dịch vụ / Terms of Service")} className="hover:underline">Điều khoản dịch vụ</button>
              <button onClick={() => setActiveScreen("contact")} className="hover:underline font-bold" style={{ color: brandTheme.secondaryColor }}>Liên hệ</button>
            </div>
          </footer>
        )}

        {showQRScanner && (
          <QRScanner 
            onScanSuccess={async (code) => {
              if (isProcessingQR.current) return;
              isProcessingQR.current = true;
              try {
                triggerToast(`Đang xác thực búp bê...`);
                const res = await gamificationApi.claimDoll(code);
                if (res.success) {
                  const bonusText = res.retroactiveBonusAwarded ? ` +${res.xpAwarded} XP Hồi tố!` : "";
                  triggerToast(`🎉 Thu thập thành công ${res.dollName}!${bonusText}`);
                  setChatBlocked(false);
                }
              } catch (e: any) {
                triggerToast(`Lỗi: ${e.message}`);
              } finally {
                setShowQRScanner(false);
                isProcessingQR.current = false;
              }
            }}
            onClose={() => setShowQRScanner(false)}
          />
        )}
      </div>
    );
  }






