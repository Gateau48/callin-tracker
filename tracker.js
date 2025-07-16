(function () {
  const endpoint = 'https://n8n.call-in.ai/webhook/track'; // Modifie avec ton vrai webhook n8n
  let trackingActive = false;
  let visitorId = null;

  // Charger FingerprintJS
  async function loadFingerprint() {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    visitorId = result.visitorId;
    setCookie('visitor_id', visitorId);
  }

  // Gestion des cookies
  function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  }

  function setCookie(name, value, days = 365) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = name + '=' + encodeURIComponent(value) + '; expires=' + expires + '; path=/';
  }

  function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  function getMetaData() {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screen: {
        width: screen.width,
        height: screen.height
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer,
      url: location.href,
      cookies: document.cookie,
      localStorage: JSON.stringify(localStorage),
      sessionStorage: JSON.stringify(sessionStorage),
      utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
      utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
      utm_medium: new URLSearchParams(window.location.search).get('utm_medium') || null
    };
  }

  async function sendEvent(eventType, extra = {}) {
    if (!trackingActive) return;

    const metadata = getMetaData();
    const data = {
      event: eventType,
      timestamp: new Date().toISOString(),
      visitor_id: visitorId || getCookie('visitor_id') || generateUUID(),
      client_id: thisScript?.dataset?.clientId || 'unknown',
      ...metadata,
      ...extra
    };

    fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async function initTracking(clientId) {
    trackingActive = true;
    await loadFingerprint();
    sendEvent('tracking_started', { client_id: clientId });

    document.addEventListener('click', (e) => {
      sendEvent('click', {
        tag: e.target.tagName,
        text: e.target.innerText?.slice(0, 100),
        id: e.target.id,
        class: e.target.className
      });
    });

    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        sendEvent('scroll', {
          scrollY: window.scrollY,
          scrollPercent: Math.round(
            (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
          )
        });
      }, 1000);
    });
  }

  const thisScript = document.currentScript;
  const clientId = thisScript?.dataset?.clientId || 'unknown';

  // Active le tracking uniquement après le clic sur le bouton de réservation
  window.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('#call-button');

    if (button) {
      button.addEventListener('click', () => {
        initTracking(clientId);
        sendEvent('call_button_clicked', { client_id: clientId });
      });
    }
  });
})();
