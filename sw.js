// 금자란 조사야장 서비스워커
// - 앱 본체는 오프라인에서도 열림 (네트워크 우선, 실패 시 캐시)
// - 지도/PDF 라이브러리(unpkg, cdnjs)는 최초 1회 받은 뒤 캐시
const VER = 'gjr-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
const LIBS = ['unpkg.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  // 파일 하나가 없어도 서비스워커 설치가 실패하지 않도록 개별 저장 (설치 불가 원인 방지)
  e.waitUntil(
    caches.open(VER)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 앱 본체(같은 출처)
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VER).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() =>
        caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
      )
    );
    return;
  }

  // 지도/PDF 라이브러리: 캐시 우선
  if (LIBS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VER).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }))
    );
  }
  // 지도 타일, 주소/기상 API는 캐시하지 않고 네트워크 사용
});
