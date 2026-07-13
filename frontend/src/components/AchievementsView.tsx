'use client';
import { GamificationStatus } from '../lib/api';
import { Trophy, Star, Medal, MapPin, Zap, ScanBarcode } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface AchievementsViewProps {
  status: GamificationStatus;
  dict: any;
}

const ALL_BADGES_VI = [
  { id: 'apprentice', title: 'Người học việc', description: 'Đạt Cấp 5', icon: '🌱', levelReq: 5 },
  { id: 'explorer', title: 'Nhà thám hiểm', description: 'Đạt Cấp 10', icon: '🧭', levelReq: 10 },
  { id: 'master', title: 'Bậc thầy văn hóa', description: 'Đạt Cấp 20', icon: '👑', levelReq: 20 },
  { id: 'hanoi_wanderer', title: 'Vạn dặm Hà Nội', description: 'Đến 5 địa điểm', icon: '🏛️', stampsReq: 5 },
  { id: 'doll_collector', title: 'Nhà sưu tầm', description: 'Kích hoạt 3 búp bê', icon: '🎎', stampsReq: 3 },
];

const ALL_BADGES_EN = [
  { id: 'apprentice', title: 'Apprentice', description: 'Reach Level 5', icon: '🌱', levelReq: 5 },
  { id: 'explorer', title: 'Explorer', description: 'Reach Level 10', icon: '🧭', levelReq: 10 },
  { id: 'master', title: 'Cultural Master', description: 'Reach Level 20', icon: '👑', levelReq: 20 },
  { id: 'hanoi_wanderer', title: 'Hanoi Wanderer', description: 'Visit 5 locations', icon: '🏛️', stampsReq: 5 },
  { id: 'doll_collector', title: 'Collector', description: 'Activate 3 dolls', icon: '🎎', stampsReq: 3 },
];

export default function AchievementsView({ status, dict }: AchievementsViewProps) {
  const { language } = useLanguage();
  const xpPercent = Math.min(100, Math.round((status.totalXp / status.nextLevelXp) * 100)) || 0;
  const ALL_BADGES = language === 'vi' ? ALL_BADGES_VI : ALL_BADGES_EN;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 animate-fadeIn">
      {/* HEADER */}
      <div className="mb-10 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-3 drop-shadow-sm">
          {language === 'vi' ? 'Thành tựu & Cấp độ' : 'Achievements & Levels'}
        </h2>
        <p className="text-stone-500 font-medium text-base md:text-lg max-w-xl mx-auto">
          {language === 'vi' ? 'Hành trình khám phá văn hóa và sưu tầm những danh hiệu cao quý.' : 'Journey of cultural discovery and collecting noble titles.'}
        </p>
      </div>

      {/* LEVELING CARD */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-stone-200/50 border border-stone-100 mb-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="flex-shrink-0 w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-4 border-white shadow-lg flex items-center justify-center relative">
            <span className="text-5xl">🏆</span>
            <div className="absolute -bottom-3 bg-stone-900 text-white text-sm font-bold px-4 py-1 rounded-full shadow-md">
              {language === 'vi' ? 'CẤP' : 'LEVEL'} {status.currentLevel}
            </div>
          </div>

          <div className="flex-1 w-full text-center md:text-left">
            <h3 className="text-2xl font-bold text-stone-800 mb-2">{language === 'vi' ? 'Thực tập sinh Văn Hóa' : 'Cultural Intern'}</h3>
            <p className="text-stone-500 mb-6 text-sm">{language === 'vi' ? 'Hãy tiếp tục khám phá để thăng cấp và nhận thêm nhiều phần thưởng giá trị!' : 'Keep exploring to level up and receive more valuable rewards!'}</p>

            <div className="mb-2 flex justify-between text-sm font-bold text-stone-700">
              <span>{status.totalXp.toLocaleString()} XP</span>
              <span className="text-amber-600">{status.nextLevelXp.toLocaleString()} XP</span>
            </div>
            <div className="w-full h-4 bg-stone-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${xpPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </div>
            </div>
            <div className="text-right mt-2 text-xs text-stone-400 font-medium">
              {language === 'vi' 
                ? `Còn ${Math.max(0, status.nextLevelXp - status.totalXp).toLocaleString()} XP nữa để lên cấp ${status.currentLevel + 1}`
                : `${Math.max(0, status.nextLevelXp - status.totalXp).toLocaleString()} XP left to reach level ${status.currentLevel + 1}`}
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatCard icon={<Zap className="w-5 h-5 text-amber-500" />} label={language === 'vi' ? "Tổng XP" : "Total XP"} value={status.totalXp.toLocaleString()} />
        <StatCard icon={<MapPin className="w-5 h-5 text-emerald-500" />} label={language === 'vi' ? "Địa điểm đã đến (Tem)" : "Locations Visited (Stamps)"} value={status.stampsUnlocked.toString()} />
        <StatCard icon={<Medal className="w-5 h-5 text-blue-500" />} label={language === 'vi' ? "Thành tựu" : "Achievements"} value={status.badgesEarned.toString()} />
      </div>

      {/* BADGES SECTION */}
      <div>
        <h3 className="text-2xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-amber-500" />
          {language === 'vi' ? 'Bộ sưu tập Huy hiệu' : 'Badge Collection'}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {ALL_BADGES.map(badge => {
            // Determine if badge is unlocked based on current stats
            const isUnlocked = 
              (badge.levelReq && status.currentLevel >= badge.levelReq) ||
              (badge.stampsReq && status.stampsUnlocked >= badge.stampsReq);

            return (
              <div 
                key={badge.id}
                className={`relative p-5 rounded-2xl flex flex-col items-center text-center transition-all duration-300 ${
                  isUnlocked 
                    ? 'bg-gradient-to-b from-amber-50 to-white border border-amber-200 shadow-md hover:-translate-y-1' 
                    : 'bg-stone-50 border border-stone-200 opacity-60 grayscale'
                }`}
              >
                <div className={`text-4xl mb-3 drop-shadow-md ${isUnlocked ? 'scale-110' : ''} transition-transform`}>
                  {badge.icon}
                </div>
                <h4 className={`font-bold text-sm mb-1 ${isUnlocked ? 'text-stone-800' : 'text-stone-500'}`}>
                  {badge.title}
                </h4>
                <p className="text-xs text-stone-500 font-medium">{badge.description}</p>
                
                {isUnlocked && (
                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 border-2 border-white shadow-sm">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* DOLL COLLECTION SECTION */}
      <div className="mt-12">
        <h3 className="text-2xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-3">
          <span className="text-3xl">🎎</span>
          {language === 'vi' ? 'Bộ sưu tập Búp bê' : 'Doll Collection'}
        </h3>
        
        {(!status.ownedDolls || status.ownedDolls.length === 0) ? (
          <div className="bg-stone-50 border-2 border-dashed border-stone-200 rounded-3xl p-10 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-stone-100">
              <ScanBarcode className="w-10 h-10 text-stone-400" />
            </div>
            <h4 className="text-lg font-bold text-stone-700 mb-2">
              {language === 'vi' ? 'Chưa có búp bê nào' : 'No dolls yet'}
            </h4>
            <p className="text-stone-500 max-w-md mx-auto text-sm">
              {language === 'vi' 
                ? 'Hãy quét mã QR trên búp bê vật lý của bạn bằng tính năng "Quét QR búp bê" ở menu profile để thêm chúng vào bộ sưu tập và nhận XP hồi tố!' 
                : 'Scan the QR code on your physical doll using the "Scan Doll QR" feature in the profile menu to add them to your collection and receive retroactive XP!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {status.ownedDolls.map(doll => (
              <div key={doll.id} className="bg-white rounded-3xl p-5 border border-stone-100 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col items-center text-center group">
                <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 mb-4 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform duration-300">
                  <div className="text-6xl drop-shadow-xl">🎎</div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>
                <h4 className="font-serif font-bold text-stone-800 mb-1 text-lg line-clamp-1">{doll.region}</h4>
                {doll.sku && (
                  <span className="text-[10px] font-mono text-stone-400 bg-stone-50 px-2 py-0.5 rounded-full border border-stone-200 mb-2">
                    {doll.sku}
                  </span>
                )}
                <div className="text-xs text-stone-500 flex flex-col gap-0.5">
                  <span className="font-medium text-emerald-600">
                    {language === 'vi' ? 'Đã kích hoạt' : 'Activated'}
                  </span>
                  <span>{new Date(doll.claimedAt).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm flex flex-col items-center justify-center text-center">
      <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center mb-2">
        {icon}
      </div>
      <div className="text-2xl font-bold text-stone-800 mb-1">{value}</div>
      <div className="text-xs font-medium text-stone-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}
