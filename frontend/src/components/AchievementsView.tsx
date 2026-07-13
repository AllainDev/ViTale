'use client';
import { GamificationStatus } from '../lib/api';
import { Trophy, Star, Medal, MapPin, Zap } from 'lucide-react';

interface AchievementsViewProps {
  status: GamificationStatus;
  dict: any;
}

const ALL_BADGES = [
  { id: 'apprentice', title: 'Người học việc', description: 'Đạt Cấp 5', icon: '🌱', levelReq: 5 },
  { id: 'explorer', title: 'Nhà thám hiểm', description: 'Đạt Cấp 10', icon: '🧭', levelReq: 10 },
  { id: 'master', title: 'Bậc thầy văn hóa', description: 'Đạt Cấp 20', icon: '👑', levelReq: 20 },
  { id: 'hanoi_wanderer', title: 'Vạn dặm Hà Nội', description: 'Đến 5 địa điểm', icon: '🏛️', stampsReq: 5 },
  { id: 'doll_collector', title: 'Nhà sưu tầm', description: 'Kích hoạt 3 búp bê', icon: '🎎', stampsReq: 3 }, // Simplified logic for demo
];

export default function AchievementsView({ status, dict }: AchievementsViewProps) {
  const xpPercent = Math.min(100, Math.round((status.totalXp / status.nextLevelXp) * 100)) || 0;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 animate-fadeIn">
      {/* HEADER */}
      <div className="mb-10 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-orange-600 mb-3 drop-shadow-sm">
          Thành tựu & Cấp độ
        </h2>
        <p className="text-stone-500 font-medium text-base md:text-lg max-w-xl mx-auto">
          Hành trình khám phá văn hóa và sưu tầm những danh hiệu cao quý.
        </p>
      </div>

      {/* LEVELING CARD */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-stone-200/50 border border-stone-100 mb-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-60 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="flex-shrink-0 w-32 h-32 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 border-4 border-white shadow-lg flex items-center justify-center relative">
            <span className="text-5xl">🏆</span>
            <div className="absolute -bottom-3 bg-stone-900 text-white text-sm font-bold px-4 py-1 rounded-full shadow-md">
              CẤP {status.currentLevel}
            </div>
          </div>

          <div className="flex-1 w-full text-center md:text-left">
            <h3 className="text-2xl font-bold text-stone-800 mb-2">Thực tập sinh Văn Hóa</h3>
            <p className="text-stone-500 mb-6 text-sm">Hãy tiếp tục khám phá để thăng cấp và nhận thêm nhiều phần thưởng giá trị!</p>

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
              Còn {Math.max(0, status.nextLevelXp - status.totalXp).toLocaleString()} XP nữa để lên cấp {status.currentLevel + 1}
            </div>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatCard icon={<Zap className="w-5 h-5 text-amber-500" />} label="Tổng XP" value={status.totalXp.toLocaleString()} />
        <StatCard icon={<MapPin className="w-5 h-5 text-emerald-500" />} label="Địa điểm đã đến (Tem)" value={status.stampsUnlocked.toString()} />
        <StatCard icon={<Medal className="w-5 h-5 text-blue-500" />} label="Thành tựu" value={status.badgesEarned.toString()} />
      </div>

      {/* BADGES SECTION */}
      <div>
        <h3 className="text-2xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-3">
          <Trophy className="w-6 h-6 text-amber-500" />
          Bộ sưu tập Huy hiệu
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
