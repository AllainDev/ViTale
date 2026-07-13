import React, { useCallback, useEffect, useState } from 'react';
import {
  gamificationApi,
  type GamificationStatus,
  type GamificationCheckpoint,
  type CheckinResult
} from '../lib/api';
import { useGeolocation } from '../lib/geolocation';
import CheckinResultModal from './CheckinResultModal';
import { useLanguage } from '../context/LanguageContext';
import { getTranslation } from '../lib/i18n';
import { MapPin, Compass, Award, Book, BookOpen } from 'lucide-react';
import AchievementsView from './AchievementsView';

export default function PassportView() {
  const { language } = useLanguage();
  const dict: any = getTranslation(language);
  const [status, setStatus] = useState<GamificationStatus | null>(null);
  const [checkpoints, setCheckpoints] = useState<GamificationCheckpoint[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [activeRegion, setActiveRegion] = useState<string>('');
  
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [activeCheckpointId, setActiveCheckpointId] = useState<string | null>(null);
  const [checkinResult, setCheckinResult] = useState<CheckinResult | null>(null);
  
  const [activeTab, setActiveTab] = useState<'passport' | 'achievements'>('passport');
  const [storyPopup, setStoryPopup] = useState<{name: string, contentUrl: string | null} | null>(null);

  const geo = useGeolocation();

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, cpRes] = await Promise.all([
        gamificationApi.getStatus(),
        gamificationApi.getCheckpoints()
      ]);
      setStatus(statusRes);
      setCheckpoints(cpRes.checkpoints);
      
      const uniqueRegions = Array.from(new Set(cpRes.checkpoints.map(c => c.region)));
      setRegions(uniqueRegions);
      if (uniqueRegions.length > 0 && !activeRegion) {
        setActiveRegion(uniqueRegions[0]);
      }
      setFetchError(null);
    } catch (err: any) {
      console.error('Failed to load gamification data:', err);
      setFetchError(err.message || dict.passportView?.connectionError || "Connection Error");
    } finally {
      setLoading(false);
    }
  }, [activeRegion, dict]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckin = async (checkpointId: string) => {
    setActiveCheckpointId(checkpointId);
    setCheckinLoading(true);
    setCheckinResult(null);
    try {
      // 1. Yêu cầu GPS trước khi checkin (bấm nút mới lấy).
      // Dùng highAccuracy=false để tránh timeout trên thiết bị GPS yếu; timeout 20s để đủ thời gian
      // cho tín hiệu Wi-Fi/cell-based khi user ở trong nhà (ví dụ check-in tại "Nhà của bạn").
      const currentGeo = await geo.requestPosition({ highAccuracy: false, timeoutMs: 20000 });
      
      if (currentGeo.error || !currentGeo.latitude || !currentGeo.longitude) {
        // Map lỗi GPS sang message tiếng Việt thân thiện.
        let friendlyMessage: string;
        const errLower = (currentGeo.error || '').toLowerCase();
        if (errLower.includes('user denied') || errLower.includes('permission')) {
          friendlyMessage = "Vui lòng cấp quyền truy cập vị trí để check-in.";
        } else if (errLower.includes('timed out') || errLower.includes('timeout')) {
          friendlyMessage = "GPS phản hồi chậm — vui lòng thử lại ở nơi thoáng (gần cửa sổ / ngoài trời).";
        } else if (errLower.includes('unavailable') || errLower.includes('not supported')) {
          friendlyMessage = "Thiết bị không hỗ trợ GPS. Hãy bật định vị rồi thử lại.";
        } else {
          friendlyMessage = currentGeo.error || "Không thể lấy toạ độ GPS. Vui lòng thử lại.";
        }

        setCheckinResult({
          success: false,
          errorMessage: friendlyMessage,
          errorCode: 'INVALID_COORDS',
          checkpointId,
          checkpointName: '',
          checkpointRegion: '',
          storyAssetUrl: null,
          xpAwarded: 0,
          totalXp: 0,
          currentLevel: 0,
          nextLevelXp: 0,
          leveledUp: false,
          isNewStamp: false,
          hasDollBonus: false,
          dollName: null,
          dollRegion: null
        });
        setCheckinLoading(false);
        setActiveCheckpointId(null);
        return;
      }

      const result = await gamificationApi.checkin({
        latitude: currentGeo.latitude,
        longitude: currentGeo.longitude,
        accuracyMeters: currentGeo.accuracy ?? undefined,
        checkpointId
      });
      setCheckinResult(result);
      fetchData(); // Refresh stamps and total xp
    } catch (err: any) {
      let errorMsg = err.message || dict.passportView?.connectionError || 'Connection Error';
      if (err.code === 'OUT_OF_RANGE') {
        errorMsg = language === 'vi' 
          ? 'Bạn cách địa điểm này quá xa. Vui lòng di chuyển lại gần hơn để check-in.' 
          : 'You are too far from this location. Please move closer to check-in.';
      } else if (err.code === 'ALREADY_COMPLETED') {
        errorMsg = language === 'vi' 
          ? 'Bạn đã check-in địa điểm này rồi.' 
          : 'You have already checked in at this location.';
      } else if (err.code === 'INVALID_COORDS') {
        errorMsg = language === 'vi' ? 'Không thể lấy được vị trí hiện tại.' : 'Unable to determine your current location.';
      }

      setCheckinResult({
        success: false,
        errorMessage: errorMsg,
        errorCode: err.code || 'ERR',
        checkpointId,
        checkpointName: '',
        checkpointRegion: '',
        storyAssetUrl: null,
        xpAwarded: 0,
        totalXp: 0,
        currentLevel: 0,
        nextLevelXp: 0,
        leveledUp: false,
        isNewStamp: false,
        hasDollBonus: false,
        dollName: null,
        dollRegion: null
      });
    } finally {
      setCheckinLoading(false);
      setActiveCheckpointId(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-stone-500 font-medium">{dict.passportView?.loading || "Loading passport data..."}</div>;
  
  if (fetchError) {
    return (
      <div className="p-8 text-center text-rose-500 bg-rose-50 rounded-2xl mx-auto max-w-md my-8 shadow-sm border border-rose-100">
        <p className="mb-4 text-lg font-semibold flex items-center justify-center gap-2">
          <span>⚠️</span> {fetchError}
        </p>
        <button 
          className="px-6 py-2.5 bg-rose-500 text-white font-medium rounded-full hover:bg-rose-600 transition-colors shadow-md" 
          onClick={fetchData}
        >
          {dict.passportView?.retry || "Retry"}
        </button>
      </div>
    );
  }

  if (!status) return <div className="p-8 text-center text-stone-500 font-medium">{dict.passportView?.noData || "No data available."}</div>;

  const activeCheckpoints = checkpoints
    .filter(c => c.region === activeRegion)
    .map(c => ({
      ...c,
      isVisited: c.isVisited || !!status?.stamps.some((s: any) => s.checkpointId === c.id)
    }));

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 animate-fadeIn">
      {/* HEADER: User Status */}
      <div className="mb-10 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 mb-3 drop-shadow-sm">
          {dict.passportView?.passportTitle || "Cultural Passport"}
        </h2>
        <p className="text-stone-500 font-medium text-base md:text-lg max-w-xl mx-auto">
          {dict.passportView?.passportSub || "Discover heritage and collect beautiful moments."}
        </p>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex justify-center mb-8">
        <div className="bg-stone-100 p-1.5 rounded-full flex gap-1 shadow-inner border border-stone-200/50">
          <button
            onClick={() => setActiveTab('passport')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'passport' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Book className="w-4 h-4" />
            {dict.passportView?.passportTab || "Hộ chiếu"}
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'achievements' 
                ? 'bg-white text-amber-600 shadow-sm' 
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Award className="w-4 h-4" />
            {dict.passportView?.achievementsTab || "Thành tựu"}
          </button>
        </div>
      </div>

      {activeTab === 'passport' ? (
        <>
          {/* REGION TABS (Beautiful Scroller) */}
          <div className="mb-8">
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide px-2">
              {regions.map(r => (
                <button
                  key={r}
                  onClick={() => setActiveRegion(r)}
                  className={`snap-center shrink-0 px-6 py-3.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                    activeRegion === r 
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 scale-105 border-0' 
                      : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <Compass className={`w-4 h-4 ${activeRegion === r ? 'text-emerald-100' : 'text-stone-400'}`} />
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* CHECKPOINT GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCheckpoints.map(cp => (
              <CheckpointCard 
                key={cp.id}
                checkpoint={cp}
                geoLoading={geo.loading && activeCheckpointId === cp.id}
                geoError={activeCheckpointId === cp.id ? geo.error : null}
                checkinLoading={checkinLoading && activeCheckpointId === cp.id}
                isAnyLoading={checkinLoading || geo.loading}
                onCheckin={() => handleCheckin(cp.id)}
                onReadStory={() => setStoryPopup({ name: cp.name, contentUrl: cp.storyAssetUrl || null })}
                dict={dict}
              />
            ))}
          </div>
        </>
      ) : (
        <AchievementsView status={status} dict={dict} />
      )}

      {checkinResult && (
        <CheckinResultModal
          result={checkinResult}
          onClose={() => {
            setCheckinResult(null);
            if (checkinResult.success) {
              fetchData();
            }
          }}
        />
      )}

      {/* STORY POPUP MODAL */}
      {storyPopup && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setStoryPopup(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-amber-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-serif font-bold text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Câu chuyện: {storyPopup.name}
              </h3>
              <button 
                onClick={() => setStoryPopup(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 text-stone-600 leading-relaxed text-sm max-h-[60vh] overflow-y-auto">
              {storyPopup.contentUrl ? (
                <div>
                  <p className="italic text-stone-500 mb-4">Mở liên kết gốc để trải nghiệm chi tiết hơn:</p>
                  <a href={storyPopup.contentUrl} target="_blank" rel="noreferrer" className="text-amber-600 font-bold hover:underline">
                    {storyPopup.contentUrl}
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  <p>
                    <strong>{storyPopup.name}</strong> lưu giữ những dấu ấn vàng son của văn hoá và lịch sử trải qua hàng ngàn năm xây dựng và phát triển. 
                  </p>
                  <p>
                    Vào những năm tháng xa xưa, nơi đây không chỉ là điểm dừng chân của các bậc danh sĩ mà còn là trung tâm giao thương sầm uất. Những bức tường, những viên gạch đều thấm đẫm mồ hôi và công sức của thế hệ đi trước.
                  </p>
                  <p>
                    Ngày nay, tuy cảnh vật đã có nhiều đổi thay, nhưng linh hồn của di sản vẫn còn vang vọng, nhắc nhở con cháu đời sau luôn tự hào và gìn giữ truyền thống tốt đẹp của dân tộc.
                  </p>
                </div>
              )}
            </div>
            <div className="bg-stone-50 p-4 border-t border-stone-100 text-center">
              <button 
                onClick={() => setStoryPopup(null)}
                className="px-6 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-lg transition-colors text-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckpointCard({ 
  checkpoint, 
  geoLoading, 
  geoError, 
  checkinLoading, 
  isAnyLoading,
  onCheckin,
  onReadStory,
  dict
}: { 
  checkpoint: GamificationCheckpoint;
  geoLoading: boolean;
  geoError: string | null;
  checkinLoading: boolean;
  isAnyLoading?: boolean;
  onCheckin: () => void;
  onReadStory: () => void;
  dict: any;
}) {
  return (
    <div className={`relative overflow-hidden p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
      checkpoint.isVisited 
        ? 'bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 shadow-emerald-100/50' 
        : 'bg-white border border-stone-200 shadow-md'
    }`}>
      {checkpoint.isVisited && (
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-100 rounded-full blur-2xl opacity-50 pointer-events-none" />
      )}
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-serif text-xl font-bold text-stone-800 leading-tight pr-4">{checkpoint.name}</h3>
          {checkpoint.isVisited && (
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
              <span className="text-emerald-600 font-bold">✓</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6 min-h-[28px]">
          {checkpoint.isVisited ? (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold tracking-wide">
              {dict.passportView?.visited || "Visited"}
            </span>
          ) : (
            <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-lg text-xs font-bold tracking-wide">
              {dict.passportView?.undiscovered || "Undiscovered"}
            </span>
          )}
          
          {checkpoint.regionDollOwned && !checkpoint.hasDollBonus ? (
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold tracking-wide">
              {dict.passportView?.dollBonusReady || "Doll Bonus: Ready"}
            </span>
          ) : checkpoint.hasDollBonus ? (
            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-xs font-bold tracking-wide border border-amber-100">
              {dict.passportView?.dollBonusClaimed || "Doll Reward Claimed"}
            </span>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="pt-2">
          {!checkpoint.isVisited ? (
            <>
              <button
                onClick={onCheckin}
                disabled={isAnyLoading || !!geoError}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-stone-900 text-white font-bold text-sm shadow-md hover:bg-stone-800 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                <MapPin className="w-4 h-4" />
                {checkinLoading 
                  ? (dict.passportView?.authenticating || "Đang xác thực...") 
                  : (dict.passportView?.checkinGps || "Check-in GPS")}
              </button>
              
              {(geoLoading || geoError) && (
                 <div className="text-center mt-3 text-xs font-medium">
                    {geoLoading ? (
                      <span className="text-emerald-600 animate-pulse">{dict.passportView?.locatingGps || "Locating GPS signal..."}</span>
                    ) : (
                      <span className="text-rose-500 bg-rose-50 px-3 py-1 rounded-full">{dict.passportView?.gpsError || "GPS Error"}: {geoError}</span>
                    )}
                 </div>
              )}
            </>
          ) : (
            <button
              onClick={onReadStory}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-md shadow-orange-600/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Xem câu chuyện
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
