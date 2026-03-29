const axios = require('axios');

const BASE = (process.env.COUCHDB_URL || 'http://admin:admin@localhost:5984').replace(/\/$/, '');
const PRODUCTS_DB = process.env.COUCHDB_PRODUCTS_DB || 'agp_web';
const NEWS_DB = process.env.COUCHDB_NEWS_DB || 'newsx';

const db = (name) => `${BASE}/${name}`;

// ── Inicializa DB de productos ──────────────────────────────────────────────
async function initProductsDb() {
    try {
        await axios.get(db(PRODUCTS_DB));
    } catch (e) {
        if (e.response && e.response.status === 404) {
            await axios.put(db(PRODUCTS_DB));
            console.log(`[CouchDB] Base de datos '${PRODUCTS_DB}' creada.`);
        }
    }
    // Crear índice para consultas
    try {
        await axios.post(`${db(PRODUCTS_DB)}/_index`, {
            index: { fields: ['type'] },
            name: 'type-index'
        });
    } catch (_) {}
}

// ── Sincronización desde productos.json (upsert siempre) ───────────────────
async function migrarDesdeJson(productosJson) {
    console.log('[CouchDB] Sincronizando productos desde JSON...');
    let ok = 0;
    for (const p of productosJson) {
        const docId = p.id || slugify(p.Nombre);
        const doc = { ...p, _id: docId, type: 'product' };
        delete doc.id;
        try {
            // Obtener _rev actual si existe
            const existing = await axios.get(`${db(PRODUCTS_DB)}/${encodeURIComponent(docId)}`).catch(() => null);
            if (existing) {
                doc._rev = existing.data._rev;
                doc.createdAt = existing.data.createdAt || new Date().toISOString();
                doc.updatedAt = new Date().toISOString();
            } else {
                doc.createdAt = new Date().toISOString();
            }
            await axios.put(`${db(PRODUCTS_DB)}/${encodeURIComponent(docId)}`, doc);
            ok++;
        } catch (e) {
            console.error(`[CouchDB] Error sincronizando ${docId}:`, e.message);
        }
    }
    console.log(`[CouchDB] ${ok}/${productosJson.length} productos sincronizados.`);
}

// ── PRODUCTOS ───────────────────────────────────────────────────────────────
async function getProductos() {
    try {
        const res = await axios.post(`${db(PRODUCTS_DB)}/_find`, {
            selector: { type: 'product' },
            limit: 200
        });
        return res.data.docs.map(normalizeProduct);
    } catch (err) {
        console.error('[CouchDB] getProductos error:', err.message);
        return [];
    }
}

async function getProductoById(id) {
    try {
        const res = await axios.get(`${db(PRODUCTS_DB)}/${encodeURIComponent(id)}`);
        return normalizeProduct(res.data);
    } catch (_) {
        return null;
    }
}

async function createProducto(data) {
    const id = data.id || slugify(data.Nombre);
    const doc = { ...data, _id: id, type: 'product', createdAt: new Date().toISOString() };
    delete doc.id;
    const res = await axios.put(`${db(PRODUCTS_DB)}/${encodeURIComponent(id)}`, doc);
    return res.data;
}

async function updateProducto(id, rev, data) {
    const doc = { ...data, _id: id, _rev: rev, type: 'product', updatedAt: new Date().toISOString() };
    delete doc.id;
    const res = await axios.put(`${db(PRODUCTS_DB)}/${encodeURIComponent(id)}`, doc);
    return res.data;
}

async function deleteProducto(id, rev) {
    const res = await axios.delete(`${db(PRODUCTS_DB)}/${encodeURIComponent(id)}?rev=${rev}`);
    return res.data;
}

// ── NOTICIAS ────────────────────────────────────────────────────────────────
async function getNoticias(limit = 6) {
    try {
        const res = await axios.post(`${db(NEWS_DB)}/_find`, {
            selector: { status: 'published' },
            sort: [{ publishedAt: 'desc' }],
            limit
        });
        return res.data.docs;
    } catch (_) {
        // Sección de noticias queda vacía si el DB no está disponible
        return [];
    }
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function normalizeProduct(doc) {
    return { ...doc, id: doc._id };
}

function slugify(str) {
    return (str || 'producto')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

module.exports = { initProductsDb, migrarDesdeJson, getProductos, getProductoById, createProducto, updateProducto, deleteProducto, getNoticias };
