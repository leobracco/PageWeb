const express = require('express');
const router = express.Router();
const couch = require('../services/couch');

// ── Middleware de autenticación ─────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (req.session && req.session.adminLoggedIn) return next();
    res.redirect('/admin/login');
}

// ── Login ───────────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
    if (req.session && req.session.adminLoggedIn) return res.redirect('/admin');
    res.render('admin/login', { error: null });
});

router.post('/login', (req, res) => {
    const { password } = req.body;
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'agp2024';

    if (password === ADMIN_PASS) {
        req.session.adminLoggedIn = true;
        return res.redirect('/admin');
    }
    res.render('admin/login', { error: 'Contraseña incorrecta.' });
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// ── Dashboard — listado de productos ───────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
    try {
        const productos = await couch.getProductos();
        res.render('admin/dashboard', { productos, flash: req.session.flash || null });
        delete req.session.flash;
    } catch (err) {
        next(err);
    }
});

// ── Nuevo producto — formulario ─────────────────────────────────────────────
router.get('/productos/nuevo', requireAuth, (req, res) => {
    res.render('admin/form', { producto: null, accion: 'Nuevo Producto', error: null });
});

// ── Crear producto ──────────────────────────────────────────────────────────
router.post('/productos', requireAuth, async (req, res, next) => {
    try {
        const data = parseFormData(req.body);
        await couch.createProducto(data);
        req.session.flash = { type: 'success', msg: `Producto "${data.Nombre}" creado correctamente.` };
        res.redirect('/admin');
    } catch (err) {
        const producto = parseFormData(req.body);
        res.render('admin/form', { producto, accion: 'Nuevo Producto', error: err.message });
    }
});

// ── Editar producto — formulario ────────────────────────────────────────────
router.get('/productos/:id/editar', requireAuth, async (req, res, next) => {
    try {
        const producto = await couch.getProductoById(req.params.id);
        if (!producto) return res.status(404).render('404', { titulo: 'Producto no encontrado' });
        res.render('admin/form', { producto, accion: 'Editar Producto', error: null });
    } catch (err) {
        next(err);
    }
});

// ── Actualizar producto ─────────────────────────────────────────────────────
router.post('/productos/:id', requireAuth, async (req, res, next) => {
    try {
        const existing = await couch.getProductoById(req.params.id);
        if (!existing) return res.status(404).render('404', { titulo: 'Producto no encontrado' });

        const data = parseFormData(req.body);
        await couch.updateProducto(req.params.id, existing._rev, data);
        req.session.flash = { type: 'success', msg: `Producto "${data.Nombre}" actualizado.` };
        res.redirect('/admin');
    } catch (err) {
        const producto = { ...parseFormData(req.body), _id: req.params.id };
        res.render('admin/form', { producto, accion: 'Editar Producto', error: err.message });
    }
});

// ── Eliminar producto ───────────────────────────────────────────────────────
router.post('/productos/:id/eliminar', requireAuth, async (req, res, next) => {
    try {
        const existing = await couch.getProductoById(req.params.id);
        if (!existing) return res.redirect('/admin');
        await couch.deleteProducto(req.params.id, existing._rev);
        req.session.flash = { type: 'warning', msg: `Producto "${existing.Nombre}" eliminado.` };
        res.redirect('/admin');
    } catch (err) {
        next(err);
    }
});

// ── Helpers ─────────────────────────────────────────────────────────────────
function parseFormData(body) {
    const tags = body.Tags ? body.Tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const specs = {};
    if (body.spec_keys) {
        const keys = Array.isArray(body.spec_keys) ? body.spec_keys : [body.spec_keys];
        const vals = Array.isArray(body.spec_vals) ? body.spec_vals : [body.spec_vals];
        keys.forEach((k, i) => { if (k.trim()) specs[k.trim()] = (vals[i] || '').trim(); });
    }
    return {
        id: body.id || '',
        Nombre: body.Nombre || '',
        Categoria: body.Categoria || '',
        Precio: body.Precio || '',
        Imagen: body.Imagen || '',
        Video: body.Video || '',
        Tags: tags,
        DescripcionCorta: body.DescripcionCorta || '',
        DescripcionLarga: body.DescripcionLarga || '',
        Especificaciones: specs,
        SEO: {
            Title: body.SEO_Title || '',
            MetaDescription: body.SEO_MetaDescription || ''
        }
    };
}

module.exports = router;
