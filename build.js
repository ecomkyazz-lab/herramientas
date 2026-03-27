const fs = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, 'site');
const DOMAIN = 'herramientasiaestudio.com';
const ADSENSE_ID = 'ca-pub-3882735980092049';
const GA_ID = 'G-XXXXXXXXXX'; // Replace with your real GA4 Measurement ID

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
  html = html.replace(/<!--[\s\S]*?={5,}[\s\S]*?-->\s*/, '');
  html = html.replace(/<!--\s*\[ADSENSE:[\s\S]*?\]\s*-->\s*/g, '');
  html = html.replace(/<!--\s*=+\s*-->\s*/g, '');
  html = html.replace(/<!--\s*SECCIÓN:[\s\S]*?-->\s*/g, '');
  html = html.replace(/<!--\s*FORMULARIO[\s\S]*?-->\s*/g, '');
  html = html.replace(/<!--\s*\[contact-form[\s\S]*?-->\s*/g, '');
  html = html.replace(/<!--\s*Campos del formulario[\s\S]*?-->\s*/g, '');
  return html.trim();
}

function isLegalPage(slug) {
  return ['/politica-de-privacidad/', '/politica-de-cookies/', '/aviso-legal/', '/contacto/', '/sobre-nosotros/'].some(s => slug.includes(s));
}

// ── Reading time ─────────────────────────────────────────
function estimateReadingTime(html) {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text.split(' ').length;
  return Math.max(1, Math.ceil(words / 200));
}

// ── Auto Table of Contents ───────────────────────────────
function generateTOC(html) {
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const headings = [];
  let match;
  while ((match = h2Regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    const id = text.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    headings.push({ text, id });
  }
  if (headings.length < 3) return { toc: '', html };

  let tocHtml = `<nav class="toc" aria-label="Tabla de contenidos">
<p class="toc-title">Contenido del artículo</p>
<ol>
${headings.map(h => `  <li><a href="#${h.id}">${h.text}</a></li>`).join('\n')}
</ol>
</nav>`;

  // Add IDs to h2 tags in the content
  let modifiedHtml = html;
  let idx = 0;
  modifiedHtml = modifiedHtml.replace(/<h2([^>]*)>(.*?)<\/h2>/gi, (full, attrs, inner) => {
    if (idx < headings.length) {
      const heading = headings[idx++];
      return `<h2${attrs} id="${heading.id}">${inner}</h2>`;
    }
    return full;
  });

  return { toc: tocHtml, html: modifiedHtml };
}

// ── Auto-insert AdSense ads in article content ───────────
function insertAdsInContent(html) {
  const AD_UNIT = `<div class="ad-container"><ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_ID}" data-ad-slot="auto" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;

  const h2Positions = [];
  const h2Regex = /<h2[\s>]/gi;
  let match;
  while ((match = h2Regex.exec(html)) !== null) {
    h2Positions.push(match.index);
  }

  if (h2Positions.length < 2) return html;

  // Insert ad before the 3rd H2 (or last if fewer) and before the last H2
  const insertPositions = [];
  if (h2Positions.length >= 3) {
    insertPositions.push(h2Positions[2]); // before 3rd h2
  }
  if (h2Positions.length >= 5) {
    insertPositions.push(h2Positions[4]); // before 5th h2
  }

  // Insert from end to start so positions don't shift
  insertPositions.sort((a, b) => b - a);
  for (const pos of insertPositions) {
    html = html.slice(0, pos) + AD_UNIT + html.slice(pos);
  }

  return html;
}

// ── Extract FAQ pairs from content ───────────────────────
function extractFAQs(html) {
  const faqs = [];
  // Match h3 followed by p (FAQ pattern)
  const faqRegex = /<h3[^>]*>\s*([^<]*\?)\s*<\/h3>\s*<p>([\s\S]*?)<\/p>/gi;
  let match;
  while ((match = faqRegex.exec(html)) !== null) {
    faqs.push({
      question: match[1].replace(/<[^>]+>/g, '').trim(),
      answer: match[2].replace(/<[^>]+>/g, '').trim()
    });
  }
  return faqs;
}

// ── Related articles ─────────────────────────────────────
let ALL_ARTICLES = []; // populated during build

function getRelatedArticles(currentSlug, currentCategory, limit = 4) {
  // Prefer same category, then others
  const sameCategory = ALL_ARTICLES.filter(a => a.slug !== currentSlug && a.category === currentCategory);
  const others = ALL_ARTICLES.filter(a => a.slug !== currentSlug && a.category !== currentCategory);
  const related = [...sameCategory, ...others].slice(0, limit);
  if (related.length === 0) return '';

  return `<section class="related-articles">
<h2>Artículos Relacionados</h2>
<div class="related-grid">
${related.map(a => `  <a href="${a.slug}" class="related-card">
    <span class="related-cat">${a.category || 'General'}</span>
    <h3>${a.title}</h3>
    <p>${a.description ? a.description.slice(0, 100) + '...' : ''}</p>
  </a>`).join('\n')}
</div>
</section>`;
}

// ── Schema builders ──────────────────────────────────────
function buildBreadcrumbSchema(meta) {
  const items = [{ name: 'Inicio', url: `https://${DOMAIN}/` }];
  const slug = meta.slug || '/';

  if (slug.startsWith('/blog/') && slug !== '/blog/') {
    items.push({ name: 'Blog', url: `https://${DOMAIN}/blog/` });
    items.push({ name: meta.title, url: `https://${DOMAIN}${slug}` });
  } else if (slug === '/blog/') {
    items.push({ name: 'Blog', url: `https://${DOMAIN}/blog/` });
  } else if (slug !== '/') {
    items.push({ name: meta.title, url: `https://${DOMAIN}${slug}` });
  }

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": item.name,
      "item": item.url
    }))
  });
}

function buildArticleSchema(meta) {
  const canonical = `https://${DOMAIN}${meta.slug || '/'}`;
  const today = new Date().toISOString().split('T')[0];
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": meta.title,
    "description": meta.description,
    "url": canonical,
    "datePublished": today,
    "dateModified": today,
    "author": {
      "@type": "Organization",
      "name": "Herramientas IA Estudio",
      "url": `https://${DOMAIN}`
    },
    "publisher": {
      "@type": "Organization",
      "name": "Herramientas IA Estudio",
      "url": `https://${DOMAIN}`
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": canonical },
    "inLanguage": "es"
  });
}

function buildFAQSchema(faqs) {
  if (faqs.length === 0) return null;
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  });
}

function buildWebSiteSchema() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "Herramientas IA Estudio",
    "url": `https://${DOMAIN}`,
    "description": "Las mejores herramientas de inteligencia artificial para estudiantes. Comparativas, guías y tutoriales en español.",
    "inLanguage": "es",
    "potentialAction": {
      "@type": "SearchAction",
      "target": `https://${DOMAIN}/blog/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  });
}

function buildOrganizationSchema() {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Herramientas IA Estudio",
    "url": `https://${DOMAIN}`,
    "description": "Plataforma educativa que analiza y compara herramientas de IA para estudiantes.",
    "sameAs": []
  });
}

// ── Visible breadcrumbs HTML ─────────────────────────────
function buildBreadcrumbsHTML(meta) {
  const slug = meta.slug || '/';
  if (slug === '/') return '';

  let crumbs = `<a href="/">Inicio</a>`;
  if (slug.startsWith('/blog/') && slug !== '/blog/') {
    crumbs += ` <span class="bc-sep">/</span> <a href="/blog/">Blog</a>`;
    crumbs += ` <span class="bc-sep">/</span> <span>${meta.title}</span>`;
  } else if (slug === '/blog/') {
    crumbs += ` <span class="bc-sep">/</span> <span>Blog</span>`;
  } else {
    crumbs += ` <span class="bc-sep">/</span> <span>${meta.title}</span>`;
  }

  return `<nav class="breadcrumbs" aria-label="Migas de pan">${crumbs}</nav>`;
}

// ── Cookie consent banner ────────────────────────────────
function cookieConsentHTML() {
  return `
  <div id="cookie-banner" class="cookie-banner" style="display:none">
    <div class="cookie-inner">
      <p>Usamos cookies propias y de terceros (Google Analytics, Google AdSense) para analizar el tráfico y mostrar publicidad personalizada. Puedes aceptar, rechazar o ver más información en nuestra <a href="/politica-de-cookies/">Política de Cookies</a>.</p>
      <div class="cookie-buttons">
        <button onclick="acceptCookies()" class="cookie-btn cookie-accept">Aceptar</button>
        <button onclick="rejectCookies()" class="cookie-btn cookie-reject">Rechazar</button>
      </div>
    </div>
  </div>
  <script>
    function acceptCookies(){document.getElementById('cookie-banner').style.display='none';localStorage.setItem('cookie-consent','accepted');loadAnalytics();}
    function rejectCookies(){document.getElementById('cookie-banner').style.display='none';localStorage.setItem('cookie-consent','rejected');}
    function loadAnalytics(){
      if('${GA_ID}'==='G-XXXXXXXXXX')return;
      var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${GA_ID}';document.head.appendChild(s);
      s.onload=function(){window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');};
    }
    (function(){
      var c=localStorage.getItem('cookie-consent');
      if(!c){document.getElementById('cookie-banner').style.display='flex';}
      else if(c==='accepted'){loadAnalytics();}
    })();
  </script>`;
}

// ── Main page builder ────────────────────────────────────
function page(meta, content, { isArticle = false, noAds = false } = {}) {
  const canonical = `https://${DOMAIN}${meta.slug || '/'}`;
  const adsenseCode = noAds ? '' : `
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}" crossorigin="anonymous"></script>`;

  // Schema.org structured data
  const schemas = [];
  schemas.push(`<script type="application/ld+json">${buildBreadcrumbSchema(meta)}</script>`);

  if (isArticle) {
    schemas.push(`<script type="application/ld+json">${buildArticleSchema(meta)}</script>`);
    const faqs = extractFAQs(content);
    const faqSchema = buildFAQSchema(faqs);
    if (faqSchema) {
      schemas.push(`<script type="application/ld+json">${faqSchema}</script>`);
    }
  }

  if (meta.slug === '/') {
    schemas.push(`<script type="application/ld+json">${buildWebSiteSchema()}</script>`);
    schemas.push(`<script type="application/ld+json">${buildOrganizationSchema()}</script>`);
  }

  // For articles: add TOC, reading time, auto-ads, related articles
  let articleHeader = '';
  let finalContent = content;
  let articleFooter = '';

  if (isArticle) {
    const readingTime = estimateReadingTime(content);
    articleHeader = `<div class="article-meta-bar">
      <span class="article-category">${meta.category || 'General'}</span>
      <span class="article-reading-time">${readingTime} min de lectura</span>
    </div>`;

    const tocResult = generateTOC(finalContent);
    finalContent = tocResult.html;

    // Insert TOC after first <p> or after <h1>
    const firstPEnd = finalContent.indexOf('</p>');
    if (tocResult.toc && firstPEnd > -1) {
      finalContent = finalContent.slice(0, firstPEnd + 4) + tocResult.toc + finalContent.slice(firstPEnd + 4);
    }

    // Auto-insert ads
    if (!noAds) {
      finalContent = insertAdsInContent(finalContent);
    }

    // Related articles
    articleFooter = getRelatedArticles(meta.slug, meta.category);
  }

  const breadcrumbsHTML = buildBreadcrumbsHTML(meta);

  // Ad banner top (for non-legal pages)
  const adTop = noAds ? '' : `<div class="ad-container ad-top"><ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_ID}" data-ad-slot="auto" data-ad-format="horizontal" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;
  const adBottom = noAds ? '' : `<div class="ad-container ad-bottom"><ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_ID}" data-ad-slot="auto" data-ad-format="horizontal" data-full-width-responsive="true"></ins><script>(adsbygoogle = window.adsbygoogle || []).push({});</script></div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meta.title || 'Herramientas IA Estudio'}</title>
  <meta name="description" content="${meta.description || ''}">
  ${meta.keywords ? `<meta name="keywords" content="${meta.keywords}">` : ''}
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <link rel="canonical" href="${canonical}">
  <link rel="alternate" hreflang="es" href="${canonical}">
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
  <meta property="og:locale" content="es_ES">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${meta.title || ''}">
  <meta name="twitter:description" content="${meta.description || ''}">

  <!-- Robots -->
  <meta name="robots" content="${isLegalPage(meta.slug || '/') ? 'noindex, follow' : 'index, follow, max-snippet:-1, max-image-preview:large'}">

  <!-- Schema.org -->
  ${schemas.join('\n  ')}
</head>
<body>
  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="logo"><img src="/assets/logo.svg" alt="Herramientas IA Estudio" class="logo-icon" width="36" height="36"><span>Herramientas IA Estudio</span></a>
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
    ${breadcrumbsHTML}
    ${articleHeader}
    ${adTop}
    ${finalContent}
    ${adBottom}
    ${articleFooter}
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

  ${cookieConsentHTML()}

  <button id="back-to-top" class="back-to-top" aria-label="Volver arriba" onclick="window.scrollTo({top:0,behavior:'smooth'})">&#8679;</button>

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
    // Back to top button visibility
    var btt = document.getElementById('back-to-top');
    window.addEventListener('scroll', function() {
      btt.classList.toggle('visible', window.scrollY > 400);
    });
    // Smooth scroll for TOC links
    document.querySelectorAll('.toc a').forEach(function(a) {
      a.addEventListener('click', function(e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  <li><strong>Email:</strong> kyazz@herramientasiaestudio.com</li>
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

// ── Cookie policy ────────────────────────────────────────
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
    const content = stripComments(html);
    const readTime = estimateReadingTime(content);
    cards += `
  <article class="blog-card">
    <div class="blog-card-header">
      <span class="blog-meta">${meta.category || 'General'}</span>
      <span class="blog-read-time">${readTime} min</span>
    </div>
    <h2><a href="${meta.slug}">${meta.title}</a></h2>
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

// ── 404 page ─────────────────────────────────────────────
function build404() {
  const meta = {
    title: 'Página no encontrada | Herramientas IA Estudio',
    description: 'La página que buscas no existe o ha sido movida.',
    slug: '/404.html'
  };
  const content = `<div class="error-404">
<h1>404 — Página no encontrada</h1>
<p>Lo sentimos, la página que buscas no existe o ha sido movida.</p>
<p>Puedes volver al <a href="/">inicio</a> o explorar nuestras <a href="/blog/">guías de IA para estudiantes</a>.</p>
<div class="error-links">
  <a href="/" class="cta-button">Ir al inicio</a>
  <a href="/blog/" class="cta-button cta-secondary">Ver el blog</a>
</div>
</div>`;
  return page(meta, content, { noAds: true });
}

// ── Build all pages ──────────────────────────────────────
function build() {
  // Clean site dir
  if (fs.existsSync(SITE_DIR)) {
    for (const entry of fs.readdirSync(SITE_DIR)) {
      const full = path.join(SITE_DIR, entry);
      fs.rmSync(full, { recursive: true, force: true });
    }
  }
  ensureDir(SITE_DIR);

  // Pre-load all articles metadata for related articles
  const blogDir = path.join(__dirname, 'blog');
  const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.html'));
  ALL_ARTICLES = [];
  for (const file of blogFiles) {
    const html = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const meta = extractMeta(html);
    if (meta.title && meta.slug) {
      ALL_ARTICLES.push(meta);
    }
  }

  // 1. CSS
  const css = fs.readFileSync(path.join(__dirname, 'config', 'style-guide.css'), 'utf8');
  fs.writeFileSync(path.join(SITE_DIR, 'style.css'), css + EXTRA_CSS);

  // Copy assets (logo, favicon)
  const assetsDir = path.join(__dirname, 'assets');
  const siteAssetsDir = path.join(SITE_DIR, 'assets');
  if (fs.existsSync(assetsDir)) {
    ensureDir(siteAssetsDir);
    for (const file of fs.readdirSync(assetsDir)) {
      fs.copyFileSync(path.join(assetsDir, file), path.join(siteAssetsDir, file));
    }
  }

  // 2. Home page
  const homeHtml = fs.readFileSync(path.join(__dirname, 'home', 'index.html'), 'utf8');
  const homeMeta = extractMeta(homeHtml);
  homeMeta.slug = '/';
  const homeContent = stripComments(homeHtml);
  fs.writeFileSync(path.join(SITE_DIR, 'index.html'), page(homeMeta, homeContent));

  // 3. Blog articles
  for (const file of blogFiles) {
    const html = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const meta = extractMeta(html);
    const content = stripComments(html);
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

  // 7. Cookie policy
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

  // 8. Contact page
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

  // 9. 404 page
  fs.writeFileSync(path.join(SITE_DIR, '404.html'), build404());

  // 10. robots.txt
  fs.writeFileSync(path.join(SITE_DIR, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /404.html

Sitemap: https://${DOMAIN}/sitemap.xml
`);

  // 11. Sitemap (dynamic) — exclude noindex pages
  const urls = [
    '/', '/blog/',
    '/ia-resumir-textos/', '/ia-hacer-trabajos/', '/ia-estudiar-idiomas/', '/ia-examenes/'
  ];
  for (const file of blogFiles) {
    const html = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const meta = extractMeta(html);
    if (meta.slug) urls.push(meta.slug);
  }
  function urlPriority(u) {
    if (u === '/') return { priority: '1.0', changefreq: 'daily' };
    if (u === '/blog/') return { priority: '0.9', changefreq: 'daily' };
    if (u.startsWith('/ia-')) return { priority: '0.8', changefreq: 'weekly' };
    if (u.startsWith('/blog/')) return { priority: '0.7', changefreq: 'monthly' };
    return { priority: '0.3', changefreq: 'monthly' };
  }
  const today = new Date().toISOString().split('T')[0];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => {
    const p = urlPriority(u);
    return `  <url>
    <loc>https://${DOMAIN}${u}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`;
  }).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(SITE_DIR, 'sitemap.xml'), sitemap);

  console.log(`Site built! ${blogFiles.length} articles + ${catFiles.length} categories + 404 + legal/contact/home/blog-index`);
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
  text-decoration: none;
}

.logo-icon {
  flex-shrink: 0;
}

.logo:hover { text-decoration: none; opacity: 0.85; }

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

/* === BREADCRUMBS === */
.breadcrumbs {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin-bottom: 1.5rem;
  padding: 0.5rem 0;
}

.breadcrumbs a {
  color: var(--color-primary);
  text-decoration: none;
}

.breadcrumbs a:hover {
  text-decoration: underline;
}

.bc-sep {
  margin: 0 0.4rem;
  color: var(--color-border);
}

/* === ARTICLE META BAR === */
.article-meta-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.article-category {
  background: var(--color-primary-light);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

.article-reading-time {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

/* === TABLE OF CONTENTS === */
.toc {
  background: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem 1.5rem;
  margin: 1.5rem 0;
}

.toc-title {
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.toc ol {
  padding-left: 1.25rem;
  margin: 0;
}

.toc li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
}

.toc a {
  color: var(--color-primary);
  text-decoration: none;
}

.toc a:hover {
  text-decoration: underline;
}

/* === AD CONTAINERS === */
.ad-container {
  margin: 2rem 0;
  text-align: center;
  min-height: 90px;
}

.ad-top { margin-top: 1rem; }
.ad-bottom { margin-bottom: 1rem; }

/* === RELATED ARTICLES === */
.related-articles {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

.related-articles h2 {
  margin-bottom: 1.25rem;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.related-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem;
  text-decoration: none;
  color: var(--color-text);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
  display: block;
}

.related-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
  text-decoration: none;
}

.related-cat {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.related-card h3 {
  font-size: 1rem;
  margin: 0.5rem 0;
  line-height: 1.3;
}

.related-card p {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  margin: 0;
  line-height: 1.4;
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

.blog-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.blog-card h2 {
  font-size: 1.25rem;
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.blog-card h2 a {
  color: var(--color-text);
  text-decoration: none;
}

.blog-card h2 a:hover {
  color: var(--color-primary);
}

.blog-meta {
  font-size: 0.8rem;
  color: var(--color-primary);
  font-weight: 600;
  background: var(--color-primary-light);
  padding: 0.15rem 0.6rem;
  border-radius: 20px;
}

.blog-read-time {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.blog-card > p:last-child {
  color: var(--color-text-secondary);
  margin-bottom: 0;
}

/* === COOKIE BANNER === */
.cookie-banner {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(32, 33, 36, 0.97);
  color: #fff;
  z-index: 9999;
  padding: 1rem 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  backdrop-filter: blur(8px);
}

.cookie-inner {
  max-width: 900px;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.cookie-inner p {
  font-size: 0.88rem;
  line-height: 1.5;
  margin: 0;
  flex: 1;
  min-width: 250px;
}

.cookie-inner a {
  color: #8ab4f8;
  text-decoration: underline;
}

.cookie-buttons {
  display: flex;
  gap: 0.75rem;
  flex-shrink: 0;
}

.cookie-btn {
  border: none;
  padding: 0.6rem 1.4rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}

.cookie-accept {
  background: var(--color-primary);
  color: #fff;
}

.cookie-accept:hover {
  background: var(--color-primary-dark);
}

.cookie-reject {
  background: transparent;
  color: #fff;
  border: 1px solid rgba(255,255,255,0.3);
}

.cookie-reject:hover {
  border-color: rgba(255,255,255,0.6);
}

/* === BACK TO TOP === */
.back-to-top {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}

.back-to-top.visible {
  opacity: 1;
  transform: translateY(0);
}

.back-to-top:hover {
  background: var(--color-primary-dark);
}

/* === 404 PAGE === */
.error-404 {
  text-align: center;
  padding: 4rem 1rem;
}

.error-404 h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.error-404 p {
  font-size: 1.1rem;
  color: var(--color-text-secondary);
  margin-bottom: 1rem;
}

.error-links {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.cta-secondary {
  background: var(--color-bg-alt) !important;
  color: var(--color-primary) !important;
  border: 1px solid var(--color-primary);
}

.cta-secondary:hover {
  background: var(--color-primary-light) !important;
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

  .related-grid {
    grid-template-columns: 1fr;
  }

  .cookie-inner {
    flex-direction: column;
    text-align: center;
  }

  .back-to-top {
    bottom: 5rem;
    right: 1rem;
  }
}
`;

build();
