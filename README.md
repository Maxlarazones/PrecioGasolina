# Mapa de gasolineras más baratas de España

Mapa interactivo, sin nada alrededor — pensado para embeber en el cuerpo de
una noticia (iframe) o para visitarlo directo. Muestra las 10 estaciones más
baratas de cada comunidad autónoma (17 + Ceuta y Melilla), con un selector
de combustible flotando arriba a la izquierda. Cada popup muestra los 4
precios (95, 98, Diésel, Diésel Premium) de esa estación.

Datos oficiales del Ministerio para la Transición Ecológica (MITECO).

## Subir a GitHub / desplegar en Vercel

Igual que siempre:

```bash
cd gasolineras-mvp
git init
git add .
git commit -m "Mapa embebible por comunidad"
git branch -M main
git remote add origin <URL_DE_TU_REPO>
git push -u origin main
```

En Vercel: importar el repo, framework Next.js (se detecta solo), deploy.
Sin variables de entorno.

## Embeber en la noticia

Una vez desplegado, en el cuerpo de la noticia:

```html
<iframe
  src="https://tu-proyecto.vercel.app"
  width="100%"
  height="600"
  style="border:0;"
  loading="lazy"
></iframe>
```

## Si alguna comunidad sigue sin aparecer (modo diagnóstico)

La clasificación por comunidad autónoma usa dos vías: primero el código
oficial `IDCCAA` que trae el propio dato de MITECO, y si eso falla, el
nombre de la provincia por texto. Debería cubrir las 19, pero por si acaso
dejé un modo de diagnóstico:

Abrí en el navegador:
`https://tu-proyecto.vercel.app/api/precios-por-comunidad?debug=1`

Te va a devolver un JSON con:
- `conteoPorComunidad`: cuántas estaciones cayeron en cada comunidad
  (si "Otras" tiene un número alto, hay estaciones sin clasificar)
- `muestraSinClasificar`: ejemplos reales de estaciones que no se pudieron
  ubicar, con su `Provincia` e `IDCCAA` tal como los da la API

Pasame ese JSON (o el bloque `muestraSinClasificar` y `conteoPorComunidad`)
y ajusto el mapeo en `lib/miteco.js` con el dato real en vez de a ciegas —
hasta ahora no pude probar contra la API real de MITECO porque el entorno
donde yo escribo el código no tiene salida a dominios del Gobierno, así que
este es el primer contacto real con el formato exacto de sus datos.

## Fuente de datos

https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/

Dato público oficial (Real Decreto 4/2013), sin API key ni autenticación.

---

# Buscador por provincia (`/buscador`)

Buscador de las 10 gasolineras más baratas de cada provincia (52, con
Ceuta y Melilla) por tipo de combustible. El mapa de portada (`/`) no
cambia.

- **Estado inicial:** toda España, con la gasolinera más barata de cada
  provincia para el combustible elegido.
- **Al buscar:** zoom a la provincia, sus 10 más baratas numeradas del 1 al
  10 en el color del combustible y el ranking en el panel.
- **Autocompletar cerrado:** solo acepta provincias de la lista. Entiende
  sin tildes, capitales, islas y nombres de comunidad ("Euskadi",
  "Catalunya", "Tenerife", "Vitoria"…). Vacío = toda España.
- **Rendimiento:** los datos (~50 KB comprimidos) viajan en el HTML y se
  regeneran cada 30 min. Buscar no hace ninguna llamada de red.
- **Sin CLS:** barra de altura fija y mapa, chip y panel superpuestos.

## Embed con filtros

```html
<iframe src="https://TU-DOMINIO/buscador?provincia=sevilla&combustible=diesel"
        width="100%" height="650" style="border:0;" loading="lazy"></iframe>
```

- `provincia`: slug en minúsculas sin tildes (`madrid`, `a-coruna`,
  `illes-balears`, `santa-cruz-de-tenerife`, `valencia-valencia`…).
- `combustible`: `95`, `98`, `diesel`, `diesel_premium`.
- Cualquier valor inválido se ignora (se muestra toda España / Gasolina 95).
- Alto recomendado: 650 px (la barra ocupa 60 px en escritorio y 104 px en
  móvil).

## Medición

El buscador emite estos eventos: `buscador_busqueda`,
`buscador_ranking_click`, `buscador_popup` y `buscador_como_llegar`.
Se envían a `window.dataLayer` y, si está dentro de un iframe, a la página
padre con `postMessage`. En larazon.es se pueden recoger así y reenviar a
Marfeel o GA:

```js
window.addEventListener("message", (e) => {
  if (!e.origin.endsWith(".vercel.app")) return; // o vuestro dominio propio
  if (e.data?.source !== "mapa-gasolina") return;
  // e.data.event, e.data.provincia, e.data.combustible, e.data.gasolinera
  window.dataLayer?.push({ event: e.data.event, ...e.data });
});
```

## Diagnóstico de provincias

`/api/precios-por-comunidad?debug=provincias` lista cómo llega cada
provincia de MITECO (código + texto) y a cuál la asignamos. `sinProvincia`
debería ser 0.
