/**
 * ad.js — 앱인토스 / AdSense 광고 연동 구조
 *
 * 실제 SDK 연동 시 아래 TODO 주석을 교체하세요.
 */

const Ad = (() => {
  // ── 설정 ──────────────────────────────────────────────────
  // TODO: 앱인토스 광고 단위 ID로 교체
  const BANNER_TOP_ID    = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  const BANNER_BOTTOM_ID = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  const REWARD_AD_ID     = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
  // ──────────────────────────────────────────────────────────

  let rewardCallback = null;

  /**
   * 배너 광고 초기화
   * 앱인토스 SDK 준비 후 이 함수를 호출하세요.
   */
  function initBanners() {
    // TODO: 실제 SDK 초기화 코드로 교체
    // 예시 (AdSense):
    // (adsbygoogle = window.adsbygoogle || []).push({});
    console.log('[Ad] 배너 광고 초기화 (SDK 미연동 상태)');
  }

  /**
   * 보상형 광고 요청 (무한 모드 진입 시 호출)
   * @param {Function} onRewarded  광고 시청 완료 콜백
   */
  function showRewardAd(onRewarded) {
    rewardCallback = onRewarded;

    // TODO: 실제 보상형 광고 SDK 호출로 교체
    // 예시 (앱인토스 보상형 광고):
    // AppInToss.showRewardAd(REWARD_AD_ID, {
    //   onRewarded: () => { rewardCallback && rewardCallback(); },
    //   onClosed: () => {},
    //   onFailed: () => { UI.showToast('광고 로딩 실패. 잠시 후 다시 시도해주세요.'); },
    // });

    // Mock: 5초 타이머로 시뮬레이션
    _mockRewardAd();
  }

  function _mockRewardAd() {
    const btn = document.getElementById('btn-ad-skip');
    const mockDiv = document.querySelector('.ad-mock');
    if (!btn || !mockDiv) return;

    btn.disabled = true;
    let sec = 5;
    mockDiv.textContent = `📺 광고 시청 중... (${sec}초)`;

    const t = setInterval(() => {
      sec--;
      if (sec <= 0) {
        clearInterval(t);
        mockDiv.textContent = '✅ 광고 시청 완료!';
        btn.disabled = false;
        btn.textContent = '무한모드 시작!';
        btn.onclick = () => {
          document.getElementById('modal-ad').classList.add('hidden');
          rewardCallback && rewardCallback();
        };
      } else {
        mockDiv.textContent = `📺 광고 시청 중... (${sec}초)`;
      }
    }, 1000);
  }

  /**
   * 배너 새로고침 (게임 완료 시 호출)
   */
  function refreshBanners() {
    // TODO: SDK에 따라 배너 새로고침 코드 삽입
    console.log('[Ad] 배너 새로고침');
  }

  return { initBanners, showRewardAd, refreshBanners };
})();

window.Ad = Ad;
