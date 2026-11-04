// ============================================================
// storage.js  ·  Almacen local generico por modulo
// ============================================================

const Store = (() => {
const PREFIX = 'inmogestion.';

function key(name) { return PREFIX + name; }

function get(name, fallback = null) {
try {
const raw = localStorage.getItem(key(name));
return raw ? JSON.parse(raw) : fallback;
} catch (err) {
console.error('[Store.get]', name, err);
return fallback;
}
}

function set(name, value) {
try {
localStorage.setItem(key(name), JSON.stringify(value));
return true;
} catch (err) {
console.error('[Store.set]', name, err);
return false;
    }
}

function remove(name) {
    localStorage.removeItem(key(name));
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

return { get, set, remove, uid };
})();