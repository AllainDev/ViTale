import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { MapPin, Compass, Award, Book, BookOpen, Map, ExternalLink, X, Globe2 } from 'lucide-react';
import AchievementsView from './AchievementsView';
import VietnamMap from './VietnamMap';
import RegionPanel from './RegionPanel';

// ── Region display mapping ──────────────────────────────────────────────────
function getRegionDisplay(region: string, language: string): string {
  if (language === 'vi') {
    if (region === 'Ha Noi' || region === 'Hanoi') return 'Hà Nội';
    if (region === 'Home') return 'Nhà của bạn';
    if (region === 'School') return 'Trường học';
    return region; // "Hà Nội", "Hồ Chí Minh", "Đà Nẵng" already correct
  }
  // English
  if (region === 'Hà Nội' || region === 'Ha Noi') return 'Hanoi';
  if (region === 'Hồ Chí Minh') return 'Ho Chi Minh City';
  if (region === 'Đà Nẵng') return 'Da Nang';
  if (region === 'Home') return 'Home';
  if (region === 'School') return 'School';
  return region;
}

// ── Mini-map modal ──────────────────────────────────────────────────────────
interface MapModalProps {
  checkpoint: GamificationCheckpoint;
  language: string;
  onClose: () => void;
}

function MapModal({ checkpoint, language, onClose }: MapModalProps) {
  const { latitude, longitude, name } = checkpoint;
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  // OpenStreetMap embed URL centered on checkpoint with marker
  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.005},${latitude - 0.004},${longitude + 0.005},${latitude + 0.004}&layer=mapnik&marker=${latitude},${longitude}`;

  const displayName = language === 'en' && name === 'Nhà của bạn' ? 'Your Home'
    : language === 'en' && name === 'Trường học' ? 'School'
    : name;

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/70 backdrop-blur-sm p-3 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-stone-200 flex flex-col"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Map className="w-5 h-5 shrink-0" />
            <h3 className="font-serif font-bold text-base truncate">{displayName}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors shrink-0 ml-2"
            aria-label="Close map"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Map iframe */}
        <div className="w-full bg-stone-100" style={{ height: '320px' }}>
          <iframe
            src={osmUrl}
            title={`Map of ${displayName}`}
            width="100%"
            height="100%"
            style={{ border: 'none', display: 'block' }}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Footer: coords + Google Maps link */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-stone-500 font-mono">
            {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </p>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('map-modal-checkin', { detail: checkpoint.id }));
                onClose();
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5" />
              {language === 'vi' ? 'Check-in GPS' : 'GPS Check-in'}
            </button>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 text-sm font-bold rounded-xl transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Main PassportView ───────────────────────────────────────────────────────
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
  const [mapCheckpoint, setMapCheckpoint] = useState<GamificationCheckpoint | null>(null);
  const [mounted, setMounted] = useState(false);

  // Map-specific state
  const [selectedProvinceId, setSelectedProvinceId] = useState<string | null>(null);
  const [regionPanelProvince, setRegionPanelProvince] = useState<any>(null);
  const [regionPanelCheckpoints, setRegionPanelCheckpoints] = useState<GamificationCheckpoint[]>([]);

  useEffect(() => {
    const handleCheckinEvent = (e: Event) => {
      const id = (e as CustomEvent).detail;
      if (id) handleCheckin(id);
    };
    window.addEventListener('map-modal-checkin', handleCheckinEvent);
    return () => window.removeEventListener('map-modal-checkin', handleCheckinEvent);
  }, []);

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
      // 401 = user chưa đăng ký/login đầy đủ → không crash, set trạng thái riêng
      if (err.status === 401 || err.status === 403) {
        setFetchError('UNAUTHORIZED');
      } else {
        setFetchError(err.message || dict.passportView?.connectionError || "Connection Error");
      }
    } finally {
      setLoading(false);
    }
  }, [activeRegion, dict]);

  useEffect(() => {
    setMounted(true);
    fetchData();
  }, [fetchData]);

  const handleCheckin = async (checkpointId: string) => {
    setActiveCheckpointId(checkpointId);
    setCheckinLoading(true);
    setCheckinResult(null);
    try {
      // Yêu cầu GPS trước khi checkin (bấm nút mới lấy).
      // Dùng highAccuracy=false để tránh timeout trên thiết bị GPS yếu; timeout 20s để đủ thời gian
      // cho tín hiệu Wi-Fi/cell-based khi user ở trong nhà.
      const currentGeo = await geo.requestPosition({ highAccuracy: false, timeoutMs: 20000 });

      if (currentGeo.error || !currentGeo.latitude || !currentGeo.longitude) {
        let friendlyMessage: string;
        const errLower = (currentGeo.error || '').toLowerCase();
        if (errLower.includes('user denied') || errLower.includes('permission')) {
          friendlyMessage = language === 'vi' ? "Vui lòng cấp quyền truy cập vị trí để check-in." : "Please grant location access to check-in.";
        } else if (errLower.includes('timed out') || errLower.includes('timeout')) {
          friendlyMessage = language === 'vi' ? "GPS phản hồi chậm — vui lòng thử lại ở nơi thoáng (gần cửa sổ / ngoài trời)." : "GPS is slow — please try again in an open area.";
        } else if (errLower.includes('unavailable') || errLower.includes('not supported')) {
          friendlyMessage = language === 'vi' ? "Thiết bị không hỗ trợ GPS. Hãy bật định vị rồi thử lại." : "Device does not support GPS. Please enable location and try again.";
        } else {
          friendlyMessage = currentGeo.error || (language === 'vi' ? "Không thể lấy toạ độ GPS. Vui lòng thử lại." : "Cannot get GPS coordinates. Please try again.");
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

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 16px', color: '#6b5a40' }}>
      <div style={{ width: 32, height: 32, border: '2.5px solid #c9a76d', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ fontFamily: 'Noto Serif, serif', fontSize: 14 }}>{dict.passportView?.loading || "Đang tải hộ chiếu..."}</p>
    </div>
  );

  if (fetchError === 'UNAUTHORIZED') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 16px', maxWidth: 360, margin: '0 auto' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(201,167,109,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c9a76d" strokeWidth="2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
        </div>
        <h3 style={{ fontFamily: 'Noto Serif, serif', fontSize: 18, fontWeight: 800, color: '#0f3a2c', marginBottom: 8 }}>
          {language === 'vi' ? 'Cần đăng nhập đầy đủ' : 'Full login required'}
        </h3>
        <p style={{ fontSize: 13, color: '#8a7a60', lineHeight: 1.6, marginBottom: 20 }}>
          {language === 'vi'
            ? 'Tính năng Hộ chiếu yêu cầu tài khoản đã được xác thực. Vui lòng đăng nhập bằng Google hoặc Facebook để mở khoá.'
            : 'The Passport feature requires a verified account. Please sign in with Google or Facebook to unlock.'}
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px', maxWidth: 360, margin: '0 auto' }}>
        <p style={{ color: '#c0392b', marginBottom: 16, fontSize: 14 }}>⚠️ {fetchError}</p>
        <button
          style={{ padding: '10px 24px', background: '#0f3a2c', color: 'white', border: 'none', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
          onClick={fetchData}
        >
          {dict.passportView?.retry || "Thử lại"}
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

  // Check if user owns a doll for the active region
  const activeRegionDollOwned = activeCheckpoints.some(c => c.regionDollOwned);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 animate-fadeIn">
      {/* HEADER */}
      <div className="mb-10 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 mb-3 drop-shadow-sm">
          {dict.passportView?.passportTitle || "Cultural Passport"}
        </h2>
        <p className="text-stone-500 font-medium text-base md:text-lg max-w-xl mx-auto">
          {dict.passportView?.passportSub || "Discover heritage and collect beautiful moments."}
        </p>
      </div>

      {/* TAB NAVIGATION */}
      <div className="flex justify-center mb-6">
        <div className="bg-stone-100 p-1.5 rounded-full flex gap-1 shadow-inner border border-stone-200/50">
          <button
            onClick={() => setActiveTab('passport')}
            className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'passport'
                ? 'bg-white shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
            style={activeTab === 'passport' ? { color: '#0f3a2c' } : {}}
          >
            <Globe2 className="w-4 h-4" />
            {language === 'vi' ? 'Hộ chiếu' : 'Passport'}
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'achievements'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Award className="w-4 h-4" />
            {dict.passportView?.achievementsTab || (language === 'vi' ? 'Thành tựu' : 'Achievements')}
          </button>
        </div>
      </div>

      {/* ══ TAB: HỘ CHIẾU (MAP) ══ */}
      {activeTab === 'passport' && (
        <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {/* Map container */}
          <div className="passport-map-container">
            <VietnamMap
              checkpoints={checkpoints}
              selectedProvinceId={selectedProvinceId}
              onProvinceClick={(province, cps) => {
                setSelectedProvinceId(province.id);
                setRegionPanelProvince(province);
                setRegionPanelCheckpoints(cps.map(c => ({
                  ...c,
                  isVisited: c.isVisited || !!status?.stamps.some((s: any) => s.checkpointId === c.id)
                })));
              }}
              primaryColor="#0f3a2c"
              secondaryColor="#c9a76d"
            />
          </div>
        </div>
      )}

      {/* ══ TAB: THÀNH TỰU ══ */}
      {activeTab === 'achievements' && (
        <AchievementsView status={status} dict={dict} />
      )}

      {/* REGION PANEL — slide-in trên mobile khi bấm vào tỉnh trên bản đồ */}
      {activeTab === 'passport' && mounted && (
        <RegionPanel
          province={regionPanelProvince}
          checkpoints={regionPanelCheckpoints}
          onClose={() => { setRegionPanelProvince(null); setSelectedProvinceId(null); }}
          onItemClick={(cp) => setMapCheckpoint(cp)}
          primaryColor="#0f3a2c"
          secondaryColor="#c9a76d"
        />
      )}

      {/* CHECK-IN RESULT MODAL */}
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

      {/* MINI-MAP MODAL */}
      {mapCheckpoint && mounted && typeof document !== 'undefined' && (
        <MapModal
          checkpoint={mapCheckpoint}
          language={language}
          onClose={() => setMapCheckpoint(null)}
        />
      )}

      {/* STORY POPUP MODAL */}
      {storyPopup && mounted && typeof document !== 'undefined' && createPortal(
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
                {language === 'vi' ? 'Câu chuyện:' : 'Story:'} {storyPopup.name}
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
                  <p className="italic text-stone-500 mb-4">{language === 'vi' ? 'Mở liên kết gốc để trải nghiệm chi tiết hơn:' : 'Open original link for a more detailed experience:'}</p>
                  <a href={storyPopup.contentUrl} target="_blank" rel="noreferrer" className="text-amber-600 font-bold hover:underline">
                    {storyPopup.contentUrl}
                  </a>
                </div>
              ) : (
                <div className="space-y-4">
                  {language === 'vi' ? (
                    <>
                      <p>
                        <strong>{storyPopup.name}</strong> lưu giữ những dấu ấn vàng son của văn hoá và lịch sử trải qua hàng ngàn năm xây dựng và phát triển.
                      </p>
                      <p>
                        Vào những năm tháng xa xưa, nơi đây không chỉ là điểm dừng chân của các bậc danh sĩ mà còn là trung tâm giao thương sầm uất. Những bức tường, những viên gạch đều thấm đẫm mồ hôi và công sức của thế hệ đi trước.
                      </p>
                      <p>
                        Ngày nay, tuy cảnh vật đã có nhiều đổi thay, nhưng linh hồn của di sản vẫn còn vang vọng, nhắc nhở con cháu đời sau luôn tự hào và gìn giữ truyền thống tốt đẹp của dân tộc.
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        <strong>{storyPopup.name}</strong> preserves the golden marks of culture and history through thousands of years of construction and development.
                      </p>
                      <p>
                        In ancient times, this place was not only a stopover for famous scholars but also a bustling trading center. The walls and bricks are imbued with the sweat and effort of the previous generation.
                      </p>
                      <p>
                        Today, although the scenery has changed a lot, the soul of the heritage still echoes, reminding future generations to always be proud of and preserve the nation's beautiful traditions.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="bg-stone-50 p-4 border-t border-stone-100 text-center">
              <button
                onClick={() => setStoryPopup(null)}
                className="px-6 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-lg transition-colors text-sm"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ── CheckpointCard ──────────────────────────────────────────────────────────
function CheckpointCard({
  checkpoint,
  geoLoading,
  geoError,
  checkinLoading,
  isAnyLoading,
  onCheckin,
  onReadStory,
  onShowMap,
  dict,
  language
}: {
  checkpoint: GamificationCheckpoint;
  geoLoading: boolean;
  geoError: string | null;
  checkinLoading: boolean;
  isAnyLoading?: boolean;
  onCheckin: () => void;
  onReadStory: () => void;
  onShowMap: () => void;
  dict: any;
  language: string;
}) {
  const displayName = language === 'en' && checkpoint.name === 'Nhà của bạn' ? 'Your Home'
    : language === 'en' && checkpoint.name === 'Trường học' ? 'School'
    : checkpoint.name;

  return (
    <div className={`relative overflow-hidden rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col ${
      checkpoint.isVisited
        ? 'bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-100 shadow-emerald-100/50'
        : 'bg-white border border-stone-200 shadow-md'
    }`}>
      {checkpoint.isVisited && (
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-100 rounded-full blur-2xl opacity-50 pointer-events-none" />
      )}

      <div className="relative z-10 p-5 flex flex-col flex-1">
        {/* Title row — fixed min height so all cards are uniform */}
        <div className="flex justify-between items-start mb-3" style={{ minHeight: '3.5rem' }}>
          <h3 className="font-serif text-lg font-bold text-stone-800 leading-snug pr-3 flex-1">
            {displayName}
          </h3>
          {checkpoint.isVisited && (
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200">
              <span className="text-emerald-600 text-sm font-bold">✓</span>
            </div>
          )}
        </div>

        {/* Status tag */}
        <div className="flex flex-wrap gap-2 mb-4">
          {checkpoint.isVisited ? (
            <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold tracking-wide">
              {dict.passportView?.visited || "Visited"}
            </span>
          ) : (
            <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-lg text-xs font-bold tracking-wide">
              {dict.passportView?.undiscovered || "Undiscovered"}
            </span>
          )}
        </div>

        {/* Action buttons — pushed to bottom with mt-auto */}
        <div className="mt-auto space-y-2">
          {/* Map button — always visible */}
          <button
            onClick={onShowMap}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-100 text-stone-700 font-bold text-sm hover:bg-stone-200 active:scale-95 transition-all border border-stone-200"
          >
            <Map className="w-4 h-4 text-emerald-600" />
            {language === 'vi' ? 'Xem bản đồ' : 'View Map'}
          </button>

          {/* GPS Check-in or Read Story */}
          {!checkpoint.isVisited ? (
            <>
              <button
                onClick={onCheckin}
                disabled={isAnyLoading || !!geoError}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 text-white font-bold text-sm shadow-md hover:bg-stone-800 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                <MapPin className="w-4 h-4 shrink-0" />
                <span>
                  {checkinLoading
                    ? (dict.passportView?.authenticating || "Đang xác thực...")
                    : (dict.passportView?.checkinGps || "📍 GPS Check-in")}
                </span>
              </button>

              {(geoLoading || geoError) && (
                <div className="text-center mt-2 text-xs font-medium">
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
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm shadow-md shadow-orange-600/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all"
            >
              <BookOpen className="w-4 h-4 shrink-0" />
              {language === 'vi' ? 'Xem câu chuyện' : 'Read Story'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
