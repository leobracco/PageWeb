const express = require('express');
const router = express.Router();
const couch = require('../services/couch');

// Variables por defecto para el render
const getRenderVars = (productos, overrides = {}) => ({
    title: 'Agro Parallel - Piloto Automático y Tecnología Agrícola de Precisión',
    description: 'Agro Parallel: pilotos automáticos RTK, monitores de siembra, control de dosis variable y bases RTK para el campo argentino. Instalación en campo, soporte técnico y financiación.',
    canonicalPath: '',
    showCarousel: false,
    showCategorias: false,
    showProductos: false,
    showProducto: false,
    showContacto: false,
    showClientes: false,
    showServicios: false,
    showNosotros: false,
    showNoticias: false,
    productosMenu: productos,
    categoriaSeleccionada: null,
    noticias: [],
    year: new Date().getFullYear(),
    ...overrides
});

// ── Homepage ────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
    try {
        const [productos, noticias] = await Promise.all([
            couch.getProductos(),
            couch.getNoticias(6)
        ]);
        res.render('index', getRenderVars(productos, {
            canonicalPath: '/',
            showCarousel: true,
            showCategorias: true,
            showNoticias: true,
            slides: productos.slice(0, 4),
            noticias
        }));
    } catch (err) { next(err); }
});

// ── Catálogo de productos ───────────────────────────────────────────────────
router.get('/productos', async (req, res, next) => {
    try {
        const productos = await couch.getProductos();
        const cat = req.query.categoria || null;
        res.render('index', getRenderVars(productos, {
            title: cat ? `${cat} | Agro Parallel` : 'Catálogo de Tecnología AgTech | Agro Parallel',
            description: cat ? `Equipos de ${cat} para el campo argentino. Instalación incluida, soporte técnico y financiación accesible. Agro Parallel.` : 'Catálogo completo de piloto automático RTK, monitores de siembra, control de dosis variable y sistemas de corte. Agro Parallel.',
            canonicalPath: cat ? `/productos?categoria=${encodeURIComponent(cat)}` : '/productos',
            showProductos: true,
            productos,
            categoriaSeleccionada: cat
        }));
    } catch (err) { next(err); }
});

// ── Detalle de producto ─────────────────────────────────────────────────────
router.get('/producto/:id', async (req, res, next) => {
    try {
        const pid = req.params.id;
        const [productos, producto] = await Promise.all([
            couch.getProductos(),
            couch.getProductoById(pid)
        ]);
        if (!producto) return res.status(404).render('404', { titulo: '404 - Producto no encontrado' });
        res.render('index', getRenderVars(productos, {
            title: (producto.SEO && producto.SEO.Title) || `${producto.Nombre} | ${producto.Categoria} | Agro Parallel`,
            description: (producto.SEO && producto.SEO.MetaDescription) || `${producto.DescripcionCorta} Instalación en campo, garantía 12 meses. Agro Parallel, San Antonio de Areco.`,
            canonicalPath: `/producto/${producto._id || producto.id}`,
            producto,
            showProducto: true
        }));
    } catch (err) { next(err); }
});

// ── Noticias (página completa) ──────────────────────────────────────────────
router.get('/noticias', async (req, res, next) => {
    try {
        const [productos, noticias] = await Promise.all([
            couch.getProductos(),
            couch.getNoticias(24)
        ]);
        res.render('index', getRenderVars(productos, {
            title: 'Noticias AgTech | Agro Parallel',
            description: 'Las últimas noticias de tecnología agrícola y el campo argentino.',
            showNoticias: true,
            noticias
        }));
    } catch (err) { next(err); }
});

// ── Sitemap dinámico ────────────────────────────────────────────────────────
router.get('/sitemap.xml', async (req, res) => {
    const productos = await couch.getProductos();
    const domain = 'https://agroparallel.com';
    const today = new Date().toISOString().split('T')[0];
    const url = (loc, freq, pri, lastmod) =>
        `  <url><loc>${loc}</loc><lastmod>${lastmod || today}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>\n`;

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += url(`${domain}/`,          'daily',   '1.0');
    xml += url(`${domain}/productos`, 'weekly',  '0.9');
    xml += url(`${domain}/noticias`,  'daily',   '0.8');
    xml += url(`${domain}/servicios`, 'monthly', '0.8');
    xml += url(`${domain}/nosotros`,  'monthly', '0.7');
    xml += url(`${domain}/contacto`,  'monthly', '0.7');
    productos.forEach(p => {
        const lastmod = (p.updatedAt || p.createdAt || today).split('T')[0];
        xml += url(`${domain}/producto/${p._id || p.id}`, 'weekly', '0.8', lastmod);
    });
    xml += '</urlset>';
    res.header('Content-Type', 'application/xml').send(xml);
});

// ── Rutas simples ───────────────────────────────────────────────────────────
router.get('/contacto', async (req, res, next) => {
    try {
        const productos = await couch.getProductos();
        res.render('index', getRenderVars(productos, {
            title: 'Contacto | Agro Parallel — San Antonio de Areco, Buenos Aires',
            description: 'Contactate con Agro Parallel para asesoramiento en piloto automático, monitores de siembra y tecnología agrícola. San Antonio de Areco, Buenos Aires.',
            canonicalPath: '/contacto',
            showContacto: true
        }));
    } catch (err) { next(err); }
});

router.get('/nosotros', async (req, res, next) => {
    try {
        const productos = await couch.getProductos();
        res.render('index', getRenderVars(productos, {
            title: 'Sobre Nosotros | Agro Parallel — Tecnología Agrícola Argentina',
            description: 'Conocé Agro Parallel: empresa argentina de agricultura de precisión con más de 500 equipos instalados en Buenos Aires, Santa Fe y Córdoba.',
            canonicalPath: '/nosotros',
            showNosotros: true,
            showClientes: true
        }));
    } catch (err) { next(err); }
});

router.get('/servicios', async (req, res, next) => {
    try {
        const productos = await couch.getProductos();
        res.render('index', getRenderVars(productos, {
            title: 'Servicios AgTech | Instalación, Soporte y Financiación | Agro Parallel',
            description: 'Instalación de piloto automático en campo en 8 horas, soporte técnico 12 meses, financiación hasta 36 cuotas. Agro Parallel, Argentina.',
            canonicalPath: '/servicios',
            showServicios: true
        }));
    } catch (err) { next(err); }
});

module.exports = router;
