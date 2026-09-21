# Gasolineras más baratas de España (MVP)

Ranking en vivo de las gasolineras más baratas de España, con mapa y buscador
por combustible + ciudad/provincia. Datos oficiales y gratuitos del
**Ministerio para la Transición Ecológica (MITECO)**.

## Qué incluye

- `/` — página con buscador (combustible + ciudad opcional), tabla top 10 y
  mapa interactivo (Leaflet).
- `/api/precios` — endpoint propio que descarga, filtra, limpia y ordena los
  datos de MITECO. Parámetros: `combustible` (`95`, `98`, `diesel`,
  `diesel_premium`), `ciudad` (texto libre, opcional), `limit` (por defecto 10,
  máx. 50).
- Cache de 30 min sobre la llamada a MITECO (vía `fetch` de Next.js) para no
  golpear la API del Gobierno en cada visita.

## Subir a GitHub

```bash
cd gasolineras-mvp
git init
git add .
git commit -m "MVP gasolineras más baratas"
git branch -M main
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

## Desplegar en Vercel

1. Entra en vercel.com → "Add New..." → "Project"
2. Importa el repo de GitHub que acabas de crear
3. Framework: Vercel lo detecta solo como **Next.js**, no hace falta tocar nada
4. Deploy. Listo — no requiere variables de entorno ni API keys.

## Checklist al desplegar (importante)

- [ ] Prueba `https://tu-proyecto.vercel.app/api/precios?combustible=95&limit=5`
      directamente en el navegador antes de mirar la UI, para confirmar que
      MITECO responde bien desde Vercel (aquí en el entorno de desarrollo no
      pude probar la llamada real por restricciones de red del sandbox, así
      que esta es la primera prueba real contra el servidor de MITECO).
- [ ] Si la API de MITECO devuelve error 403/500 puntual, no es el código:
      esa API pública a veces tiene caídas breves de mantenimiento. Vale la
      pena tener un mensaje de error amigable (ya está en la UI) y no
      alarmarse si falla una vez.
- [ ] Revisa que no aparezcan precios en 0 o absurdamente bajos (dato sucio de
      algún operador) — el código ya filtra precios <= 0, pero si ves algo raro
      avísame y ajustamos el filtro.

## Próximo paso (Fase 2, cuando esto valide tráfico)

La arquitectura ya está lista para eso sin tocar el backend:
- Páginas programáticas por provincia (`/gasolineras-mas-baratas/madrid`, etc.)
  reutilizando el mismo `/api/precios?ciudad=Madrid`
- Solo hay que añadir rutas `app/gasolineras-mas-baratas/[ciudad]/page.js` que
  llamen al mismo endpoint con la ciudad fija.

## Fuente de datos

Geoportal de Precios de Carburantes, MITECO:
https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/

Dato público oficial (Real Decreto 4/2013), sin necesidad de API key ni
autenticación.
