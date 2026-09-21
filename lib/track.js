// Eventos del buscador. Se envían por dos vías, las dos inofensivas si
// nadie escucha:
// 1. window.dataLayer (por si se añade GTM a esta app).
// 2. postMessage a la página que contiene el iframe (larazon.es), que puede
//    escuchar los mensajes con source "mapa-gasolina" y reenviarlos a
//    Marfeel o GA. Ver README.
export function track(event, params = {}) {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event, ...params });
  } catch {}
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: "mapa-gasolina", event, ...params }, "*");
    }
  } catch {}
}
