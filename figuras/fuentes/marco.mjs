// marco.mjs — Mete una figura de Anatomy dentro de la página del taller: la misma cabecera, el título,
// el panel «Qué estás viendo» y el pie. La cabecera y el pie se leen de index.html para que no se desfasen.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const AQUI = dirname(fileURLToPath(import.meta.url));
const INDEX = readFileSync(join(AQUI, "../../index.html"), "utf8");
const trozo = (re) => (INDEX.match(re) || [""])[0];
// En una figura no hay menú lateral: la cabecera lleva la marca y un enlace para volver al taller.
const cabeceraFigura = () => fuera(trozo(/<header class="cabecera">[\s\S]*?<\/header>/))
  .replace(/\s*<button class="btn-lateral"[\s\S]*?<\/button>/, "")
  .replace("</header>", '  <a class="btn-lateral btn-volver" href="../index.html#/">← Volver al taller</a>\n  </header>');
const fuera = (html) => html.replace(/href="#\//g, 'href="../index.html#/');

/** Agrupa piezas con un material del taller (colores de relleno y de línea). Ver assets/css/figura.css. */
export const mat = (nombre, svg) => `<g class="m-${nombre}">${svg}</g>`;

/**
 * paginaTaller({ isoCss, titulo, etiqueta, h1, lead, css, card, script, panel })
 * extra: HTML que va debajo de la figura (una chuleta, una tabla).
 * card: lo que devuelve plateHtml. En el pie (caption), «¶» separa párrafos.
 * En las claves, una etiqueta «[#ff7a50] Texto» pinta una muestra de ese color. **Texto** va en negrita.
 */
export function paginaTaller({ isoCss, titulo, etiqueta, h1, lead, css = "", card, script = "", panel = "Qué estás viendo", extra = "" }) {
  const fuentes = [...INDEX.matchAll(/<link rel="(?:preconnect|stylesheet)" href="https:\/\/fonts[^>]*>/g)].map((m) => m[0]).join("\n  ");
  const taller = (trozo(/<title>[^<]*<\/title>/).replace(/<\/?title>/g, "").split("·")[0] || "Taller").trim();
  // La leyenda de colores sale del panel y va bajo la lámina; el panel se queda con la explicación.
  const claves = (card.match(/<span class="iso-keys">[\s\S]*?(?=<span class="iso-caption">|<\/figcaption>)/) || [""])[0];
  const cuerpo = card
    .replace(claves, "")
    .replace('<figcaption class="iso-legend">', `${claves ? `<div class="fig-claves">${claves}</div>` : ""}<figcaption class="iso-legend"><span class="fig-panel-t">${panel}</span>`)
    .replace(/\s*¶\s*/g, '</span><span class="iso-caption">')
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    // Una clave que empieza por [#color] lleva una muestra de ese color en vez del trazo del kit.
    .replace(/<svg class="iso-swatch"[^>]*>(?:(?!<\/svg>)[\s\S])*<\/svg>\[(#[0-9a-fA-F]{6})\]\s*/g, '<i class="fig-color" style="background:$1"></i>');
  return `<!doctype html>
<html lang="es" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="color-scheme" content="light">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>${titulo} · ${taller}</title>
  <meta name="theme-color" content="#f6eddd">
  <link rel="icon" href="../assets/img/icono.svg" type="image/svg+xml">
  ${fuentes}
  <style>${isoCss}${css}</style>
  <link rel="stylesheet" href="../assets/css/app.css">
  <link rel="stylesheet" href="../assets/css/dibujo.css">
  <link rel="stylesheet" href="../assets/css/figura.css">
</head>
<body>
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  ${cabeceraFigura()}
  <main id="contenido" tabindex="-1">
    <div class="fig iso" data-theme="light">
      <div class="fig-cab">
        <span class="etiqueta">${etiqueta}</span>
        <h1>${h1}</h1>
        <p class="lead">${lead}</p>
      </div>
      ${cuerpo}
      ${extra}
    </div>
  </main>
  ${fuera(trozo(/<footer class="pie">[\s\S]*?<\/footer>/))}
  ${script ? `<script type="module">${script.replace(/<\/(script)/gi, "<\\/$1")}</script>` : ""}
</body>
</html>
`;
}
