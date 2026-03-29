const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");

// Función para leer el JSON de productos
const getProductos = () => {
    try {
        const data = fs.readFileSync(path.join(__dirname, "../productos.json"), "utf-8");
        return JSON.parse(data);
    } catch (err) {
        console.error("Error leyendo productos.json:", err);
        return [];
    }
};

// Generador de variables por defecto para evitar ReferenceErrors
// Generador de variables por defecto actualizado
const getRenderVars = (productos, overrides = {}) => {
    return {
        title: "Agro Parallel - Soluciones Agrícolas de Precisión",
        description: "Líderes en tecnología para el agro: Pilotos automáticos y monitores de siembra.",
        showCarousel: false,
        showCategorias: false,
        showProductos: false,
        showProducto: false,
        showContacto: false,
        showClientes: false,
        showServicios: false,
        showNosotros: false,
        productosMenu: productos, 
        categoriaSeleccionada: null, // <--- SOLUCIÓN: Definida por defecto como null
        year: new Date().getFullYear(),
        ...overrides
    };
};

// Rutas
router.get("/", (req, res) => {
    const productos = getProductos();
    res.render("index", getRenderVars(productos, { 
        showCarousel: true, 
        showCategorias: true,
        slides: productos.slice(0, 4) 
    }));
});

router.get("/productos", (req, res) => {
    const productos = getProductos();
    const cat = req.query.categoria || null; // Captura el filtro de la URL (?categoria=...)

    res.render("index", getRenderVars(productos, { 
        title: "Catálogo AgTech | Agro Parallel", 
        showProductos: true,
        productos: productos,
        categoriaSeleccionada: cat // Pasa la categoría activa a la vista
    }));
});

router.get("/producto/:id", (req, res) => {
    const productos = getProductos();
    const producto = productos.find(p => p.id === req.params.id);
    if (producto) {
        res.render("index", getRenderVars(productos, {
            title: producto.SEO?.Title || producto.Nombre,
            description: producto.SEO?.MetaDescription,
            producto: producto,
            showProducto: true
        }));
    } else {
        res.status(404).render("index", getRenderVars(productos, { title: "404 - No encontrado" }));
    }
});
// Ruta: Sitemap Dinámico para Google (SEO)
router.get("/sitemap.xml", (req, res) => {
    const productos = getProductos();
    const domain = "https://agroparallel.com";

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>${domain}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
      <url><loc>${domain}/productos</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
      <url><loc>${domain}/servicios</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
      <url><loc>${domain}/nosotros</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
      <url><loc>${domain}/contacto</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`;
    
    // Páginas Dinámicas de Productos
    productos.forEach(p => {
        xml += `
        <url>
            <loc>${domain}/producto/${p.id}</loc>
            <changefreq>weekly</changefreq>
            <priority>0.8</priority>
        </url>`;
    });
    
    xml += `</urlset>`;
    
    res.header('Content-Type', 'application/xml');
    res.send(xml);
});
// Rutas simples
router.get("/contacto", (req, res) => res.render("index", getRenderVars(getProductos(), { showContacto: true })));
router.get("/nosotros", (req, res) => res.render("index", getRenderVars(getProductos(), { showNosotros: true, showClientes: true })));
router.get("/servicios", (req, res) => res.render("index", getRenderVars(getProductos(), { showServicios: true })));

module.exports = router;