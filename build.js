const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, 'site');
const DOMAIN = 'herramientasiaestudio.com';

// ── helpers ──────────────────────────────────────────────
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function extractMeta(html) {
  const meta = {};
  const commentMatch = html.match(/<!--([\s\S]*?)-->/);
  if (commentMatch) {
    const block = commentMatch[1];
    const titleMatch = block.match(/Meta título:\s*(.+)/);
    const descMatch = block.match(/Meta descripción:\s*(.+)/);
    const slugMatch = block.match(/Slug:\s*(.+)/);
    const catMatch = block.match(/Categoría:\s*(.+)/);
    const keyMatch = block.match(/Keywords:\s*(.+)/);
    if (titleMatch) meta.title = titleMatch[1].trim();
    if (descMatch) meta.description = descMatch[1].trim();
    if (slugMatch) meta.slug = slugMatch[1].trim();
    if (catMatch) meta.category = catMatch[1].trim();
    if (keyMatch) meta.keywords = keyMatch[1].trim();
  }
  return meta;
}

function stripComments(html) {
  // Remove the metadata comment block at the top
  html = html.replace(/<!--[\s\S]*?={5,}[\s\S]*?-->\s*/, '');
  // Remove ADSENSE placeholder comments
  html = html.replace(/<!--\s*\[ADSENSE:[\s\S]*?\]\s*-->\s*/g, '');
  // Remove section separator comments
  html = html.replace(/<!--\s*=+\s*-->\s*/g, '');
  html = html.replace(/<!--\s*SECCIÓN:[\s\S]*?-->\s*/g, '');
  // Remove wordpress form comments
  html = html.replace(/<!--\s*FORMULARIO[\s\S]*?-->\s*/g, '');
  html = html.replace(/<!--\s*\[contact-form[\s\S]*?-->\s*/g, '');
  html = html.replace(/<!--\s*Campos del formulario[\s\S]*?-->\s*/g, '');
  return html.trim();
}

function isLegalPage(slug) {
  return ['/politica-de-privacidad/', '/politica-de-cookies/', '/aviso-legal/', '/contacto/', '/sobre-nosotros/'].some(s => slug.includes(s));
}

function page(meta, content, { isArticle = false, noAds = false } = {}) {
  const canonical = `https://${DOMAIN}${meta.slug || '/'}`;
  const adsenseCode = noAds ? '' : `
    <!-- AdSense -->
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossorigin="anonymous"></script>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title || 'Herramientas IA Estudio'}</title>
  <meta name="description" content="${meta.description || ''}">
  ${meta.keywords ? `<meta name="keywords" content="${meta.keywords}">` : ''}
  <link rel="canonical" href="${canonical}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
  ${adsenseCode}

  <!-- Open Graph -->
  <meta property="og:title" content="${meta.title || ''}">
  <meta property="og:description" content="${meta.description || ''}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="${isArticle ? 'article' : 'website'}">
  <meta property="og:site_name" content="Herramientas IA Estudio">
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo">Herramientas IA Estudio</a>
      <button class="menu-toggle" aria-label="Menú" onclick="document.querySelector('.nav-menu').classList.toggle('open')">&#9776;</button>
      <nav class="nav-menu">
        <a href="/">Inicio</a>
        <div class="dropdown">
          <a href="#" class="dropdown-toggle">Categorías</a>
          <div class="dropdown-menu">
            <a href="/ia-resumir-textos/">IA para Resumir Textos</a>
            <a href="/ia-hacer-trabajos/">IA para Hacer Trabajos</a>
            <a href="/ia-estudiar-idiomas/">IA para Estudiar Idiomas</a>
            <a href="/ia-examenes/">IA para Exámenes</a>
          </div>
        </div>
        <a href="/blog/">Blog</a>
        <a href="/sobre-nosotros/">Sobre Nosotros</a>
        <a href="/contacto/">Contacto</a>
      </nav>
    </div>
  </header>

  <main class="container">
    ${content}
  </main>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-links">
        <a href="/politica-de-privacidad/">Política de Privacidad</a>
        <a href="/politica-de-cookies/">Política de Cookies</a>
        <a href="/aviso-legal/">Aviso Legal</a>
        <a href="/contacto/">Contacto</a>
      </div>
      <p class="footer-copy">&copy; 2026 herramientasiaestudio.com — Todos los derechos reservados.</p>
    </div>
  </footer>

  <script>
    // Close dropdown on outside click
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
      }
    });
    document.querySelectorAll('.dropdown-toggle').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        this.closest('.dropdown').classList.toggle('open');
      });
    });
  </script>
</body>
</html>`;
}

// ── Contact page with real form ──────────────────────────
function buildContactContent() {
  return `<h1>Contacto</h1>

<p>¿Tienes alguna pregunta, sugerencia o quieres colaborar con nosotros? Rellena el formulario y te responderemos en menos de 48 horas.</p>

<p>También puedes escribirnos directamente a: <strong>contacto@herramientasiaestudio.com</strong></p>

<h2>Formulario de Contacto</h2>

<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST" class="contact-form">
  <div class="form-group">
    <label for="name">Nombre *</label>
    <input type="text" id="name" name="name" required>
  </div>
  <div class="form-group">
    <label for="email">Correo electrónico *</label>
    <input type="email" id="email" name="email" required>
  </div>
  <div class="form-group">
    <label for="subject">Asunto</label>
    <select id="subject" name="subject">
      <option value="Pregunta general">Pregunta general</option>
      <option value="Sugerencia de herramienta">Sugerencia de herramienta</option>
      <option value="Colaboración">Colaboración</option>
      <option value="Otro">Otro</option>
    </select>
  </div>
  <div class="form-group">
    <label for="message">Mensaje *</label>
    <textarea id="message" name="message" rows="6" required></textarea>
  </div>
  <div class="form-group form-checkbox">
    <input type="checkbox" id="privacy" name="privacy" required>
    <label for="privacy">He leído y acepto la <a href="/politica-de-privacidad/">Política de Privacidad</a> *</label>
  </div>
  <button type="submit" class="cta-button">Enviar mensaje</button>
</form>

<h2>Otros Canales</h2>

<ul>
  <li><strong>Email:</strong> contacto@herramientasiaestudio.com</li>
  <li><strong>Twitter/X:</strong> @herramientasiaestudio</li>
</ul>

<h2>Preguntas Frecuentes</h2>

<h3>¿Recomendáis herramientas a cambio de pago?</h3>
<p>No. Todas nuestras recomendaciones se basan en pruebas reales. Si una herramienta nos patrocina, lo indicamos claramente en el artículo.</p>

<h3>¿Puedo sugerir una herramienta para que la analicéis?</h3>
<p>Sí. Usa el formulario de contacto con el asunto "Sugerencia de herramienta" e incluye el nombre de la herramienta y un enlace.</p>

<h3>¿Aceptáis artículos de invitados?</h3>
<p>Valoramos colaboraciones de calidad. Envíanos tu propuesta con un borrador del artículo y tu perfil profesional.</p>`;
}

// ── Cookie policy without WordPress cookies ──────────────
function buildCookiesContent() {
  return `<h1>Política de Cookies</h1>

<p><strong>Última actualización:</strong> marzo de 2026</p>

<p>En cumplimiento de la normativa vigente, <strong>herramientasiaestudio.com</strong> informa a los usuarios sobre el uso de cookies en este Sitio Web.</p>

<h2>¿Qué Son las Cookies?</h2>

<p>Las cookies son pequeños archivos de texto que se almacenan en el dispositivo del usuario al visitar un sitio web. Permiten que el sitio recuerde información sobre tu visita, como tus preferencias de idioma, para facilitar la navegación y hacerla más útil.</p>

<h2>Tipos de Cookies que Utilizamos</h2>

<h3>Cookies analíticas</h3>
<p>Recopilan información sobre cómo los usuarios utilizan el Sitio Web (páginas visitadas, tiempo de permanencia, fuente de tráfico) de forma agregada y anónima.</p>

<table>
  <thead>
    <tr>
      <th>Cookie</th>
      <th>Proveedor</th>
      <th>Finalidad</th>
      <th>Duración</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>_ga</td><td>Google Analytics</td><td>Distinguir usuarios</td><td>2 años</td></tr>
    <tr><td>_ga_*</td><td>Google Analytics</td><td>Estado de la sesión</td><td>2 años</td></tr>
    <tr><td>_gid</td><td>Google Analytics</td><td>Distinguir usuarios</td><td>24 horas</td></tr>
  </tbody>
</table>

<h3>Cookies publicitarias</h3>
<p>Utilizadas por Google AdSense y sus socios para mostrar anuncios relevantes basados en los intereses del usuario.</p>

<table>
  <thead>
    <tr>
      <th>Cookie</th>
      <th>Proveedor</th>
      <th>Finalidad</th>
      <th>Duración</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>__gads</td><td>Google AdSense</td><td>Publicidad personalizada</td><td>13 meses</td></tr>
    <tr><td>__gpi</td><td>Google AdSense</td><td>Publicidad personalizada</td><td>13 meses</td></tr>
    <tr><td>NID</td><td>Google</td><td>Preferencias de anuncios</td><td>6 meses</td></tr>
    <tr><td>IDE</td><td>Google DoubleClick</td><td>Retargeting</td><td>13 meses</td></tr>
  </tbody>
</table>

<h2>Cómo Gestionar las Cookies</h2>

<p>Puedes configurar tu navegador para aceptar, rechazar o eliminar cookies. Ten en cuenta que bloquear ciertas cookies puede afectar al funcionamiento del sitio.</p>

<ul>
  <li><strong>Google Chrome:</strong> Configuración > Privacidad y seguridad > Cookies</li>
  <li><strong>Mozilla Firefox:</strong> Opciones > Privacidad y seguridad > Cookies</li>
  <li><strong>Safari:</strong> Preferencias > Privacidad > Cookies</li>
  <li><strong>Microsoft Edge:</strong> Configuración > Cookies y permisos del sitio</li>
</ul>

<p>Para gestionar las cookies de Google AdSense específicamente, visita: <a href="https://www.google.com/settings/ads" rel="nofollow noopener">Configuración de Anuncios de Google</a>.</p>

<h2>Consentimiento</h2>

<p>Al acceder a este Sitio Web, se muestra un banner informativo sobre el uso de cookies. El usuario puede aceptar todas las cookies, rechazar las no esenciales o configurar sus preferencias. El consentimiento puede retirarse en cualquier momento desde la configuración del navegador.</p>

<h2>Cambios en esta Política</h2>

<p>Esta política puede actualizarse para reflejar cambios en las cookies utilizadas o en la legislación aplicable. Recomendamos revisarla periódicamente.</p>

<p>Para cualquier consulta, contacta con nosotros en: <strong>contacto@herramientasiaestudio.com</strong>.</p>`;
}

// ── Blog index page (dynamic) ────────────────────────────
function buildBlogIndex() {
  const blogDir = path.join(__dirname, 'blog');
  const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html')).sort().reverse();

  let cards = '';
  for (const file of blogFiles) {
    const html = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const meta = extractMeta(html);
    if (!meta.title || !meta.slug) continue;
    cards += `
  <article class="blog-card">
    <h2><a href="${meta.slug}">${meta.title}</a></h2>
    <p class="blog-meta">${meta.category || 'General'}</p>
    <p>${meta.description || ''}</p>
  </article>
`;
  }

  return `<h1>Blog: Guías y Comparativas de IA para Estudiar</h1>

<p>Todas nuestras guías, comparativas y tutoriales sobre herramientas de inteligencia artificial para estudiantes. Contenido actualizado, probado y en español.</p>

<div class="blog-list">
${cards}
</div>`;
}

// ── Build all pages ──────────────────────────────────────
function build() {
  // Clean site dir contents (without removing the dir itself — avoids EPERM on Windows)
  if (fs.existsSync(SITE_DIR)) {
    for (const entry of fs.readdirSync(SITE_DIR)) {
      const full = path.join(SITE_DIR, entry);
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
  ensureDir(SITE_DIR);

  // 1. CSS
  const css = fs.readFileSync(path.join(__dirname, 'config', 'style-guide.css'), 'utf8');
  fs.writeFileSync(path.join(SITE_DIR, 'style.css'), css + EXTRA_CSS);

  // 2. Home page
  const homeHtml = fs.readFileSync(path.join(__dirname, 'home', 'index.html'), 'utf8');
  const homeMeta = extractMeta(homeHtml);
  homeMeta.slug = '/';
  const homeContent = stripComments(homeHtml);
  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), page(homeMeta, homeContent));

  // 3. Blog articles
  const blogDir = path.join(__dirname, 'blog');
  const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
  for (const file of blogFiles) {
    const html = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const meta = extractMeta(html);
    const content = stripComments(html);
    // slug like /blog/mejores-ia-resumir-apuntes/
    const slugParts = meta.slug.replace(/^\//, '').replace(/\/$/, '').split('/');
    const outDir = path.join(SITE_DIR, ...slugParts);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), page(meta, content, { isArticle: true }));
  }

  // 4. Blog index
  const blogIndexDir = path.join(SITE_DIR, 'blog');
  ensureDir(blogIndexDir);
  const blogIndexMeta = {
    title: 'Blog | Herramientas IA Estudio',
    description: 'Guías, comparativas y tutoriales sobre herramientas de inteligencia artificial para estudiantes. Contenido actualizado 2026.',
    slug: '/blog/'
  };
  fs.writeFileSync(path.join(blogIndexDir, 'index.html'), page(blogIndexMeta, buildBlogIndex()));

  // 5. Category pages
  const catDir = path.join(__dirname, 'categorias');
  const catFiles = fs.readdirSync(catDir).filter(f => f.endsWith('.html'));
  for (const file of catFiles) {
    const html = fs.readFileSync(path.join(catDir, file), 'utf8');
    const meta = extractMeta(html);
    const content = stripComments(html);
    const slugClean = meta.slug.replace(/^\//, '').replace(/\/$/, '');
    const outDir = path.join(SITE_DIR, slugClean);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), page(meta, content));
  }

  // 6. Legal pages (no ads)
  const legalFiles = {
    'politica-privacidad.html': { slug: '/politica-de-privacidad/' },
    'aviso-legal.html': { slug: '/aviso-legal/' },
    'sobre-nosotros.html': { slug: '/sobre-nosotros/' },
  };
  for (const [file, info] of Object.entries(legalFiles)) {
    const html = fs.readFileSync(path.join(__dirname, 'legales', file), 'utf8');
    const meta = extractMeta(html);
    meta.slug = info.slug;
    const content = stripComments(html);
    const slugClean = meta.slug.replace(/^\//, '').replace(/\/$/, '');
    const outDir = path.join(SITE_DIR, slugClean);
    ensureDir(outDir);
    fs.writeFileSync(path.join(outDir, 'index.html'), page(meta, content, { noAds: true }));
  }

  // 7. Cookie policy (custom, no WordPress cookies, no ads)
  const cookieMeta = {
    title: 'Política de Cookies | Herramientas IA Estudio',
    description: 'Información sobre las cookies que utiliza herramientasiaestudio.com, su finalidad y cómo gestionarlas.',
    slug: '/politica-de-cookies/'
  };
  ensureDir(path.join(SITE_DIR, 'politica-de-cookies'));
  fs.writeFileSync(
    path.join(SITE_DIR, 'politica-de-cookies', 'index.html'),
    page(cookieMeta, buildCookiesContent(), { noAds: true })
  );

  // 8. Contact page (custom with real form, no ads)
  const contactMeta = {
    title: 'Contacto | Herramientas IA Estudio',
    description: '¿Tienes alguna pregunta o sugerencia? Contacta con el equipo de Herramientas IA Estudio. Respondemos en menos de 48 horas.',
    slug: '/contacto/'
  };
  ensureDir(path.join(SITE_DIR, 'contacto'));
  fs.writeFileSync(
    path.join(SITE_DIR, 'contacto', 'index.html'),
    page(contactMeta, buildContactContent(), { noAds: true })
  );

  // 9. robots.txt
  fs.writeFileSync(path.join(SITE_DIR, 'robots.txt'), `User-agent: *
Allow: /

Sitemap: https://${DOMAIN}/sitemap.xml
`);

  // 10. Sitemap (dynamic)
  const urls = [
    '/', '/blog/',
    '/ia-resumir-textos/', '/ia-hacer-trabajos/', '/ia-estudiar-idiomas/', '/ia-examenes/',
    '/sobre-nosotros/', '/contacto/',
    '/politica-de-privacidad/', '/politica-de-cookies/', '/aviso-legal/'
  ];
  // Add all blog article slugs dynamically
  for (const file of blogFiles) {
    const html = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const meta = extractMeta(html);
    if (meta.slug) urls.push(meta.slug);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>https://${DOMAIN}${u}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
  </url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(SITE_DIR, 'sitemap.xml'), sitemap);

  console.log(`Site built! ${blogFiles.length} articles + ${catFiles.length} categories + legal/contact/home/blog-index`);
  console.log(`Output: ${SITE_DIR}`);
}

// ── Extra CSS for layout ─────────────────────────────────
const EXTRA_CSS = `

/* === SITE LAYOUT === */
* { box-sizing: border-box; margin: 0; padding: 0; }

.container {
  max-width: 820px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

/* === HEADER === */
.site-header {
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1100px;
  padding: 1rem 1.5rem;
}

.logo {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}

.logo:hover { text-decoration: none; }

.nav-menu {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.nav-menu a {
  color: var(--color-text);
  font-size: 0.95rem;
  font-weight: 500;
  text-decoration: none;
}

.nav-menu a:hover {
  color: var(--color-primary);
  text-decoration: none;
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text);
}

/* Dropdown */
.dropdown { position: relative; }

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem 0;
  min-width: 220px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  z-index: 200;
}

.dropdown.open .dropdown-menu { display: block; }

.dropdown-menu a {
  display: block;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.dropdown-menu a:hover {
  background: var(--color-bg-alt);
}

/* === MAIN === */
main.container {
  padding-top: 2.5rem;
  padding-bottom: 3rem;
  min-height: 60vh;
}

/* === FOOTER === */
.site-footer {
  background: var(--color-bg-alt);
  border-top: 1px solid var(--color-border);
  padding: 2rem 0;
  margin-top: 3rem;
}

.footer-inner {
  max-width: 1100px;
  text-align: center;
}

.footer-links {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.footer-links a {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  text-decoration: none;
}

.footer-links a:hover {
  color: var(--color-primary);
}

.footer-copy {
  color: var(--color-text-secondary);
  font-size: 0.85rem;
}

/* === BLOG LIST === */
.blog-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-top: 2rem;
}

.blog-card {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  transition: box-shadow 0.2s ease;
}

.blog-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.blog-card h2 {
  font-size: 1.25rem;
  margin-top: 0;
  margin-bottom: 0.25rem;
}

.blog-card h2 a {
  color: var(--color-text);
  text-decoration: none;
}

.blog-card h2 a:hover {
  color: var(--color-primary);
}

.blog-meta {
  font-size: 0.85rem;
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.blog-card > p:last-child {
  color: var(--color-text-secondary);
  margin-bottom: 0;
}

/* === CONTACT FORM === */
.contact-form {
  max-width: 600px;
  margin: 1.5rem 0;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.4rem;
  font-size: 0.95rem;
}

.form-group input[type="text"],
.form-group input[type="email"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--color-primary-light);
}

.form-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.form-checkbox input { margin-top: 4px; }
.form-checkbox label { font-weight: 400; }

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .menu-toggle { display: block; }

  .nav-menu {
    display: none;
    flex-direction: column;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    padding: 1rem 1.5rem;
    gap: 0.75rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  .nav-menu.open { display: flex; }

  .dropdown-menu {
    position: static;
    box-shadow: none;
    border: none;
    padding-left: 1rem;
  }

  .header-inner { max-width: 100%; }
  .footer-inner { max-width: 100%; }
}
`;

build();
