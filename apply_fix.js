const fs = require('fs');
const filePath = 'frontend/src/components/Canvas.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  const [isTyping, setIsTyping] = useState(false);\n  const chatBottomRef = useRef<HTMLDivElement>(null);,
  const [isTyping, setIsTyping] = useState(false);\n  const [chatBlocked, setChatBlocked] = useState(false);\n  const chatBottomRef = useRef<HTMLDivElement>(null);
);

content = content.replace(
    useEffect(() => {\n    chatBottomRef.current?.scrollIntoView({ behavior: \"smooth\" });\n  }, [chatHistory, isTyping]);,
    useEffect(() => {\n    if (activeScreen === \"assistant\" && user) {\n      gamificationApi.getStatus().then(status => {\n        if (!status.ownedDolls || status.ownedDolls.length === 0) {\n          setChatBlocked(true);\n        } else {\n          setChatBlocked(false);\n        }\n      }).catch(() => {\n        setChatBlocked(true);\n      });\n    }\n  }, [activeScreen, user, currentLanguage]);\n\n  useEffect(() => {\n    chatBottomRef.current?.scrollIntoView({ behavior: \"smooth\" });\n  }, [chatHistory, isTyping]);
);

const oldModal = {activeScreen === "assistant" && !user && (
            <div className="flex flex-col items-center justify-center min-h-[480px] p-10 animate-fadeIn text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <Bot className="w-9 h-9 text-emerald-700" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h2 className="font-serif text-2xl font-bold text-stone-800">Tr? lý 3D Tô N?</h2>
                <p className="text-stone-500 text-sm leading-relaxed">Ðang nh?p d? trò chuy?n cùng Nàng Tô N? — tr? lý AI di s?n van hoá Vi?t Nam c?a b?n.</p>
              </div>
              <button
                onClick={() => { setAuthMode("login"); setActiveScreen("auth"); }}
                className="px-8 py-3 rounded-full text-sm font-bold text-white shadow-lg hover:scale-105 transition-all"
                style={{ backgroundColor: brandTheme.primaryColor }}
              >
                Ðang nh?p ngay
              </button>
            </div>
          )}
          {activeScreen === "assistant" && user && (;

const newModal = {activeScreen === "assistant" && (!user || chatBlocked) && (
            <div className="flex flex-col items-center justify-center min-h-[480px] p-10 animate-fadeIn text-center gap-6">
              <div className="w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center">
                <Bot className="w-9 h-9 text-emerald-700" />
              </div>
              <div className="space-y-2 max-w-sm">
                <h2 className="font-serif text-2xl font-bold text-stone-800">Tr? lý 3D Tô N?</h2>
                <p className="text-stone-500 text-sm leading-relaxed">
                  {!user 
                    ? "Ðang nh?p d? trò chuy?n cùng Nàng Tô N? — tr? lý AI di s?n van hoá Vi?t Nam c?a b?n."
                    : "Tài kho?n c?a b?n chua s? h?u b?t k? Nhân v?t 3D nào. Hãy suu t?m Búp bê và quét mã QR d? m? khóa tính nang Chat nhé!"
                  }
                </p>
              </div>
              <button
                onClick={() => { 
                  if (!user) {
                    setAuthMode("login"); setActiveScreen("auth");
                  } else {
                    setShowQRScanner(true);
                  }
                }}
                className="px-8 py-3 rounded-full text-sm font-bold text-white shadow-lg hover:scale-105 transition-all"
                style={{ backgroundColor: brandTheme.primaryColor }}
              >
                {!user ? "Ðang nh?p ngay" : "Quét mã QR ngay"}
              </button>
            </div>
          )}
          {activeScreen === "assistant" && user && !chatBlocked && (;

content = content.replace(oldModal, newModal);
fs.writeFileSync(filePath, content);
console.log("Done updating Canvas.tsx");
