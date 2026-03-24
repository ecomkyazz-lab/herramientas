# Configuración WordPress — herramientasiaestudio.com

## Tema Recomendado

**GeneratePress** (versión gratuita o premium)
- Ligero, rápido, SEO-friendly
- Colores personalizables: azul (#1a73e8), blanco (#ffffff), gris (#f8f9fa)
- Compatible con Google AdSense sin conflictos

Alternativas: Astra, Kadence, Flavor

## Plugins Imprescindibles

### SEO
- **Yoast SEO** o **Rank Math** — configurar meta títulos y descripciones de cada página/artículo
- **XML Sitemaps** (incluido en Yoast/Rank Math)

### Rendimiento
- **WP Super Cache** o **LiteSpeed Cache** — caché de páginas
- **Autoptimize** — minificar CSS/JS
- **ShortPixel** o **Imagify** — compresión de imágenes

### Legal / RGPD
- **Complianz** o **CookieYes** — banner de cookies RGPD
- **Contact Form 7** o **WPForms Lite** — formulario de contacto

### Seguridad
- **Wordfence** o **Sucuri Security**

### Otros
- **Table of Contents Plus** o **Easy Table of Contents** — índice automático en artículos largos
- **Social Warfare** o **Shareaholic** — botones de compartir

## Estructura de Menú

### Menú Principal (Header)
```
Inicio
Categorías ▼
  ├── IA para Resumir Textos
  ├── IA para Hacer Trabajos
  ├── IA para Estudiar Idiomas
  └── IA para Exámenes
Blog
Sobre Nosotros
Contacto
```

### Menú Footer
```
Política de Privacidad
Política de Cookies
Aviso Legal
Contacto
```

## Configuración de Páginas y Slugs

| Página | Slug | Tipo |
|--------|------|------|
| Home | / | Página estática |
| IA para Resumir Textos | /ia-resumir-textos/ | Página |
| IA para Hacer Trabajos | /ia-hacer-trabajos/ | Página |
| IA para Estudiar Idiomas | /ia-estudiar-idiomas/ | Página |
| IA para Exámenes | /ia-examenes/ | Página |
| Blog | /blog/ | Página de entradas |
| Sobre Nosotros | /sobre-nosotros/ | Página |
| Contacto | /contacto/ | Página |
| Política de Privacidad | /politica-de-privacidad/ | Página |
| Política de Cookies | /politica-de-cookies/ | Página |
| Aviso Legal | /aviso-legal/ | Página |

### Artículos del Blog

| Artículo | Slug | Categoría |
|----------|------|-----------|
| Las 7 Mejores IA para Resumir Apuntes en 2026 | /blog/mejores-ia-resumir-apuntes/ | IA para Resumir Textos |
| Cómo Usar ChatGPT para Estudiar: Guía Completa | /blog/como-usar-chatgpt-para-estudiar/ | IA para Resumir Textos, IA para Exámenes |
| IA para Hacer Trabajos de Universidad sin Plagiar | /blog/ia-para-hacer-trabajos-universidad/ | IA para Hacer Trabajos |
| 5 Apps con IA para Aprender Inglés Gratis | /blog/apps-ia-aprender-ingles/ | IA para Estudiar Idiomas |
| Cómo Generar Exámenes Tipo Test con IA | /blog/generar-examenes-tipo-test-con-ia/ | IA para Exámenes |
| 10 Herramientas IA Gratis para Estudiantes | /blog/herramientas-ia-gratis-estudiantes/ | General |
| Cómo Usar ChatGPT para Practicar Idiomas | /blog/chatgpt-para-practicar-idiomas/ | IA para Estudiar Idiomas |
| IA para Oposiciones: Herramientas para Prepararte Mejor | /blog/ia-para-oposiciones/ | IA para Exámenes |
| Cómo Usar Notion AI para Organizar el Estudio | /blog/notion-ai-para-estudiantes/ | IA para Resumir Textos |
| IA vs Métodos Tradicionales: ¿Qué Funciona Mejor? | /blog/ia-vs-metodos-tradicionales-estudio/ | General |

## Configuración de Permalinks

Ajustes > Enlaces permanentes > **Nombre de la entrada**
```
/%postname%/
```

## Página de Inicio

Ajustes > Lectura:
- "Tu página de inicio muestra": **Una página estática**
- Página de inicio: **Home**
- Página de entradas: **Blog**
