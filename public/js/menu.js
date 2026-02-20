// ============================================
// Mis Raízes - Menu Frontend Logic (Firebase)
// ============================================

// Category icons mapping
const CATEGORY_ICONS = {
    'DESAYUNOS': '☀️',
    'PLATOS PRINCIPALES': '🍽️',
    'COMBOS': '⭐',
    'ENTRADAS': '🥑',
    'POSTRES': '🍰',
    'RACIONES': '🍲',
    'BEBIDAS': '🥛',
    'LICORES': '🍺'
};

function getCategoryIcon(category) {
    const upper = category.toUpperCase();
    for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
        if (upper.includes(key)) return icon;
    }
    return '🍴';
}

function getCategorySubtitle(category) {
    const upper = category.toUpperCase();
    if (upper.includes('DESAYUNOS')) return 'Servido de 9:00 a 12:00';
    if (upper.includes('PRINCIPALES')) return 'Nuestros platos estrella';
    if (upper.includes('COMBOS')) return 'Las mejores combinaciones';
    if (upper.includes('ENTRADAS')) return 'Para empezar';
    if (upper.includes('POSTRES')) return 'El broche de oro';
    if (upper.includes('RACIONES')) return 'Acompañamientos';
    if (upper.includes('BEBIDAS')) return 'Refrescantes';
    if (upper.includes('LICORES')) return 'Para brindar';
    return '';
}

function formatPrice(price) {
    return parseFloat(price).toFixed(2).replace('.', ',');
}

// Load menu from Firestore
async function loadMenu() {
    const content = document.getElementById('menuContent');
    const loading = document.getElementById('loadingState');
    const navScroll = document.getElementById('navScroll');

    try {
        const snapshot = await db.collection('menu').orderBy('orden').get();

        if (snapshot.empty) {
            loading.innerHTML = `
        <p class="loading-text" style="color: var(--gold);">La carta se está preparando...</p>
        <p class="loading-text" style="font-size: 0.7rem;">Vuelve pronto</p>
      `;
            return;
        }

        const categories = [];
        const menu = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            const catName = data.nombre;
            categories.push(catName);
            // Only show available items
            menu[catName] = (data.items || []).filter(item => item.disponible !== 'no').map(item => ({
                nombre: item.nombre,
                precio: parseFloat(item.precio) || 0,
                descripcion: item.descripcion || ''
            }));
        });

        if (categories.length === 0) {
            loading.innerHTML = `
        <p class="loading-text" style="color: var(--gold);">La carta se está preparando...</p>
        <p class="loading-text" style="font-size: 0.7rem;">Vuelve pronto</p>
      `;
            return;
        }

        // Build navigation
        const allBtn = document.createElement('button');
        allBtn.className = 'nav-btn active';
        allBtn.textContent = 'Todo';
        allBtn.addEventListener('click', () => {
            filterCategory('all');
            setActiveNav(allBtn);
        });
        navScroll.appendChild(allBtn);

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'nav-btn';
            btn.textContent = cat.replace(/\(.*\)/, '').trim();
            btn.addEventListener('click', () => {
                filterCategory(cat);
                setActiveNav(btn);
            });
            navScroll.appendChild(btn);
        });

        // Build menu sections
        let html = '';
        categories.forEach(cat => {
            const items = menu[cat];
            if (!items || items.length === 0) return;

            const icon = getCategoryIcon(cat);
            const subtitle = getCategorySubtitle(cat);
            const isCombo = cat.toUpperCase().includes('COMBO');
            const isDesayuno = cat.toUpperCase().includes('DESAYUNO');

            html += `
        <section class="category-section" data-category="${cat}" id="cat-${cat.replace(/\s+/g, '-')}">
          <div class="category-header">
            <span class="category-icon">${icon}</span>
            <div>
              <h2 class="category-title">${cat}</h2>
              ${subtitle ? `<p class="category-subtitle">${subtitle}</p>` : ''}
            </div>
          </div>
          ${isDesayuno ? '<div class="category-note"><span class="icon">☕</span> Opción +1€ el café</div>' : ''}
          <div class="menu-items">
      `;

            items.forEach(item => {
                const extraClass = isCombo ? ' combo' : '';
                html += `
          <div class="menu-item${extraClass}">
            <div class="item-info">
              <p class="item-name">${item.nombre}</p>
              ${item.descripcion ? `<p class="item-description">${item.descripcion}</p>` : ''}
            </div>
            ${!isCombo ? '<div class="item-dots"></div>' : ''}
            <span class="item-price">${formatPrice(item.precio)}<span class="euro"> €</span></span>
          </div>
        `;
            });

            html += `</div></section>`;
        });

        loading.style.display = 'none';
        content.insertAdjacentHTML('beforeend', html);

        // Intersection observer for scroll animations
        observeSections();

    } catch (err) {
        console.error('Error loading menu:', err);
        loading.innerHTML = `
      <p class="loading-text" style="color: var(--gold);">No se pudo cargar la carta</p>
      <p class="loading-text" style="font-size: 0.7rem;">Inténtalo de nuevo más tarde</p>
    `;
    }
}

// Filter by category
function filterCategory(cat) {
    const sections = document.querySelectorAll('.category-section');
    sections.forEach(section => {
        if (cat === 'all' || section.dataset.category === cat) {
            section.style.display = '';
            section.classList.add('visible');
        } else {
            section.style.display = 'none';
        }
    });

    if (cat !== 'all') {
        const target = document.querySelector(`[data-category="${cat}"]`);
        if (target) {
            const navHeight = document.getElementById('categoryNav').offsetHeight;
            const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 15;
            window.scrollTo({ top, behavior: 'smooth' });
        }
    }
}

function setActiveNav(activeBtn) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    activeBtn.classList.add('active');
}

// Intersection Observer for reveal animations
function observeSections() {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.category-section').forEach(section => {
        observer.observe(section);
    });
}

// Scroll to top button
function initScrollTop() {
    const btn = document.getElementById('scrollTopBtn');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Sticky nav shadow
function initNavShadow() {
    const nav = document.getElementById('categoryNav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    loadMenu();
    initScrollTop();
    initNavShadow();
});
