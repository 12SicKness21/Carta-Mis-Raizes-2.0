// ============================================
// Mis Raízes - Admin Panel Logic (Firebase)
// ============================================

// Fixed admin email for Firebase Auth (user only sees password field)
var ADMIN_EMAIL = 'admin@misraizes.com';
var menuItems = [];
var categoryDocs = []; // Track Firestore category documents

// === Auth with Firebase ===
document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var pw = document.getElementById('loginPassword').value;
    var errEl = document.getElementById('loginError');

    try {
        await auth.signInWithEmailAndPassword(ADMIN_EMAIL, pw);
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadMenuData();
    } catch (err) {
        console.error('Auth error:', err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
            errEl.textContent = 'Contraseña incorrecta';
        } else if (err.code === 'auth/user-not-found') {
            errEl.textContent = 'Usuario no configurado';
        } else {
            errEl.textContent = 'Error de conexión';
        }
    }
});

// Check if already logged in
auth.onAuthStateChanged(function (user) {
    if (user) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadMenuData();
    }
});

function logout() {
    auth.signOut();
    menuItems = [];
    categoryDocs = [];
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginScreen').style.display = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('loginError').textContent = '';
}

// === Load Menu Data from Firestore ===
async function loadMenuData() {
    try {
        var snapshot = await db.collection('menu').orderBy('orden').get();
        menuItems = [];
        categoryDocs = [];

        snapshot.forEach(function (doc) {
            var data = doc.data();
            categoryDocs.push({ id: doc.id, nombre: data.nombre, orden: data.orden });
            var items = data.items || [];
            items.forEach(function (item) {
                menuItems.push({
                    categoria: data.nombre,
                    nombre: item.nombre || '',
                    precio: String(item.precio || '0'),
                    descripcion: item.descripcion || '',
                    disponible: item.disponible || 'si'
                });
            });
        });

        renderSections();
    } catch (err) {
        console.error('Error loading menu:', err);
        showStatus('Error al cargar el menú', 'error');
    }
}

// === Category Colors ===
var CATEGORY_COLORS = {
    'DESAYUNOS': '#e8a838',
    'PLATOS PRINCIPALES': '#c9785d',
    'COMBOS': '#a87ed4',
    'ENTRADAS': '#5dba7a',
    'POSTRES': '#e06088',
    'RACIONES': '#6aadcf',
    'BEBIDAS': '#4fc1b0',
    'LICORES': '#d4a14e'
};

function getCategoryColor(cat) {
    var upper = (cat || '').toUpperCase();
    var keys = Object.keys(CATEGORY_COLORS);
    for (var i = 0; i < keys.length; i++) {
        if (upper.indexOf(keys[i]) !== -1) return CATEGORY_COLORS[keys[i]];
    }
    return '#d4a853';
}

// Get unique categories preserving original order
function getCategories() {
    var seen = {};
    var cats = [];
    for (var i = 0; i < menuItems.length; i++) {
        var cat = menuItems[i].categoria || '';
        if (cat && !seen[cat]) {
            seen[cat] = true;
            cats.push(cat);
        }
    }
    return cats;
}

// Sort items so they group by category
function sortByCategory() {
    var catOrder = getCategories();
    var catMap = {};
    for (var i = 0; i < catOrder.length; i++) {
        catMap[catOrder[i]] = [];
    }
    for (var j = 0; j < menuItems.length; j++) {
        var cat = menuItems[j].categoria || '';
        if (!catMap[cat]) catMap[cat] = [];
        catMap[cat].push(menuItems[j]);
    }
    menuItems = [];
    var allKeys = Object.keys(catMap);
    for (var k = 0; k < allKeys.length; k++) {
        for (var m = 0; m < catMap[allKeys[k]].length; m++) {
            menuItems.push(catMap[allKeys[k]][m]);
        }
    }
}

// === Render Category Sections ===
function renderSections() {
    var container = document.getElementById('menuSections');
    var empty = document.getElementById('emptyState');

    if (menuItems.length === 0) {
        container.innerHTML = '';
        empty.style.display = '';
        return;
    }

    empty.style.display = 'none';

    // Group items by category
    var categories = [];
    var catMap = {};
    for (var i = 0; i < menuItems.length; i++) {
        var cat = menuItems[i].categoria || 'Sin categoría';
        if (!catMap[cat]) {
            catMap[cat] = [];
            categories.push(cat);
        }
        catMap[cat].push({ item: menuItems[i], globalIndex: i });
    }

    var html = '';

    for (var c = 0; c < categories.length; c++) {
        var catName = categories[c];
        var catColor = getCategoryColor(catName);
        var items = catMap[catName];

        html += '<div class="category-section" style="border-color: ' + catColor + ';">';

        // Category header
        html += '<div class="category-header" style="border-left: 4px solid ' + catColor + ';">';
        html += '<span class="category-header-name" style="color: ' + catColor + ';">' + escapeHtml(catName) + '</span>';
        html += '<button class="btn-add" onclick="addItem(\'' + escapeAttr(catName) + '\')" title="Añadir plato a ' + escapeAttr(catName) + '">＋</button>';
        html += '</div>';

        // Items list
        html += '<div class="category-items">';
        for (var j = 0; j < items.length; j++) {
            var item = items[j].item;
            var idx = items[j].globalIndex;

            html += '<div class="item-row" data-index="' + idx + '">';
            html += '<div class="item-field item-name">';
            html += '<input class="cell-input" value="' + escapeHtml(item.nombre || '') + '" placeholder="Nombre del plato" onchange="updateItem(' + idx + ', \'nombre\', this.value)">';
            html += '</div>';
            html += '<div class="item-field item-price">';
            html += '<input class="cell-input price" type="number" step="0.10" min="0" value="' + parseFloat(item.precio || 0).toFixed(2) + '" onchange="updateItem(' + idx + ', \'precio\', this.value)">';
            html += '<span class="price-symbol">€</span>';
            html += '</div>';
            html += '<div class="item-field item-desc">';
            html += '<input class="cell-input" value="' + escapeHtml(item.descripcion || '') + '" placeholder="Descripción (opcional)" onchange="updateItem(' + idx + ', \'descripcion\', this.value)">';
            html += '</div>';
            html += '<div class="item-field item-avail">';
            html += '<select class="cell-select" onchange="updateItem(' + idx + ', \'disponible\', this.value)">';
            html += '<option value="si"' + (item.disponible !== 'no' ? ' selected' : '') + '>Sí</option>';
            html += '<option value="no"' + (item.disponible === 'no' ? ' selected' : '') + '>No</option>';
            html += '</select>';
            html += '</div>';
            html += '<div class="item-field item-actions">';
            html += '<button class="btn-icon" onclick="deleteItem(' + idx + ')" title="Eliminar">\u{1F5D1}\u{FE0F}</button>';
            html += '</div>';
            html += '</div>';
        }
        html += '</div>';

        html += '</div>';
    }

    container.innerHTML = html;
}

// === CRUD Operations ===
function updateItem(index, field, value) {
    menuItems[index][field] = value;
}

function deleteItem(index) {
    if (confirm('¿Eliminar "' + menuItems[index].nombre + '"?')) {
        menuItems.splice(index, 1);
        renderSections();
        showStatus('Plato eliminado. Recuerda guardar los cambios.', 'info');
    }
}

function addItem(category) {
    var newItem = {
        categoria: category,
        nombre: '',
        precio: '0.00',
        descripcion: '',
        disponible: 'si'
    };

    // Find the position to insert (after the last item of this category)
    var insertIndex = -1;
    for (var j = menuItems.length - 1; j >= 0; j--) {
        if (menuItems[j].categoria === category) {
            insertIndex = j + 1;
            break;
        }
    }

    if (insertIndex === -1) {
        menuItems.push(newItem);
        insertIndex = menuItems.length - 1;
    } else {
        menuItems.splice(insertIndex, 0, newItem);
    }

    renderSections();

    // Scroll to and focus the new row
    setTimeout(function () {
        var row = document.querySelector('.item-row[data-index="' + insertIndex + '"]');
        if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            var nameInput = row.querySelector('.item-name .cell-input');
            if (nameInput) nameInput.focus();
        }
    }, 200);

    showStatus('Nuevo plato añadido en "' + category + '". Edita el nombre y precio, luego guarda.', 'info');
}

function addCategory() {
    var name = prompt('Nombre de la nueva categoría:');
    if (!name || !name.trim()) return;

    name = name.trim().toUpperCase();

    // Check if category already exists
    var existing = getCategories();
    for (var i = 0; i < existing.length; i++) {
        if (existing[i].toUpperCase() === name) {
            showStatus('La categoría "' + name + '" ya existe.', 'error');
            return;
        }
    }

    // Add a placeholder item in the new category
    menuItems.push({
        categoria: name,
        nombre: '',
        precio: '0.00',
        descripcion: '',
        disponible: 'si'
    });

    renderSections();

    // Scroll to the new section
    setTimeout(function () {
        var sections = document.querySelectorAll('.category-section');
        var lastSection = sections[sections.length - 1];
        if (lastSection) {
            lastSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            var nameInput = lastSection.querySelector('.item-name .cell-input');
            if (nameInput) nameInput.focus();
        }
    }, 200);

    showStatus('Categoría "' + name + '" creada. Añade platos y guarda.', 'success');
}

// === Save to Firestore ===
async function saveMenu() {
    try {
        sortByCategory();

        // Group items by category
        var categories = getCategories();
        var catMap = {};
        for (var i = 0; i < menuItems.length; i++) {
            var cat = menuItems[i].categoria || '';
            if (!catMap[cat]) catMap[cat] = [];
            catMap[cat].push({
                nombre: menuItems[i].nombre,
                precio: menuItems[i].precio,
                descripcion: menuItems[i].descripcion,
                disponible: menuItems[i].disponible
            });
        }

        // Use a batch write for atomicity
        var batch = db.batch();

        // Delete existing category docs
        var existingDocs = await db.collection('menu').get();
        existingDocs.forEach(function (doc) {
            batch.delete(doc.ref);
        });

        // Write new category docs
        for (var c = 0; c < categories.length; c++) {
            var catName = categories[c];
            var slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            var docRef = db.collection('menu').doc(slug);
            batch.set(docRef, {
                nombre: catName,
                orden: c,
                items: catMap[catName] || []
            });
        }

        await batch.commit();
        showStatus('✅ Menú guardado correctamente', 'success');
        renderSections();
    } catch (err) {
        console.error('Error saving menu:', err);
        showStatus('❌ Error al guardar: ' + err.message, 'error');
    }
}

// === QR Modal (Static Image) ===
function showQRModal() {
    document.getElementById('qrModal').style.display = '';
}

function closeQRModal() {
    document.getElementById('qrModal').style.display = 'none';
}

function printQR() {
    window.print();
}

// === Status Bar ===
function showStatus(message, type) {
    type = type || 'info';
    var bar = document.getElementById('statusBar');
    var msg = document.getElementById('statusMessage');
    bar.style.display = '';
    bar.className = 'status-bar ' + type;
    msg.textContent = message;

    if (type === 'success') {
        setTimeout(function () { hideStatus(); }, 5000);
    }
}

function hideStatus() {
    document.getElementById('statusBar').style.display = 'none';
}

// === Helpers ===
function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escapeAttr(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}
