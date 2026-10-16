// Gabarit commun des pages légales statiques (public/*.html). Usage : node scripts/legal/build.mjs
export const CONTACT = 'maxoujapiot@gmail.com'
export const UPDATED = '16 octobre 2026'

export function page({ title, description, body }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${title} · Hors Norme</title>
<meta name="description" content="${description}" />
<meta name="theme-color" content="#120d26" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<style>
  :root { color-scheme: dark; --bg:#120d26; --surface:#241b46; --text:#f7f3ff; --muted:#b3a9d6; --accent:#ffd23f; --cyan:#3ee6d3; }
  * { box-sizing: border-box; }
  body { margin:0; background: radial-gradient(120% 50% at 50% -10%, #3a2380 0%, transparent 60%), var(--bg); color: var(--text);
    font: 17px/1.6 ui-rounded, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; -webkit-text-size-adjust: 100%; }
  main { max-width: 720px; margin: 0 auto; padding: calc(env(safe-area-inset-top) + 32px) 20px calc(env(safe-area-inset-bottom) + 48px); }
  a { color: var(--cyan); }
  .brand { display:inline-block; font-weight: 900; letter-spacing: -0.02em; text-transform: uppercase; color: var(--text); text-decoration: none; font-size: 22px; }
  .brand span { color: var(--accent); }
  h1 { font-size: clamp(30px, 7vw, 42px); line-height: 1.1; margin: 24px 0 8px; }
  h2 { font-size: 21px; margin: 36px 0 8px; color: var(--accent); }
  p, li { color: #e4ddff; }
  .updated { color: var(--muted); font-size: 14px; margin-bottom: 28px; }
  .card { background: var(--surface); border-radius: 16px; padding: 16px 18px; margin: 16px 0; }
  .card strong { color: var(--text); }
  ul { padding-left: 22px; }
  nav { margin-top: 48px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.12); display: flex; flex-wrap: wrap; gap: 8px 18px; font-size: 15px; }
  table { width: 100%; border-collapse: collapse; font-size: 15px; }
  td, th { text-align: left; padding: 8px 6px; border-bottom: 1px solid rgba(255,255,255,.1); vertical-align: top; }
  th { color: var(--muted); font-weight: 700; }
</style>
</head>
<body>
<main>
<a class="brand" href="/">Hors <span>Norme</span></a>
<h1>${title}</h1>
<p class="updated">Dernière mise à jour : ${UPDATED}</p>
${body}
<nav aria-label="Pages d'information">
  <a href="/">Jouer</a>
  <a href="/support">Aide &amp; contact</a>
  <a href="/confidentialite">Confidentialité</a>
  <a href="/mentions-legales">Mentions légales</a>
</nav>
</main>
</body>
</html>
`
}
