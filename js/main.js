/*
  Forma — features shared by every page
  (theme switcher, favorites and cart in the navbar, back-to-top button)
*/

/* ===== Theme switcher ===== */
// The same key is read by js/theme.js in <head>
const themeStore = new LocalStore('forma-theme', null, function (value) {
  return value === 'light' || value === 'dark';
});

function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

// The button label always names the theme a click will switch to
function updateThemeButton(theme) {
  const button = document.getElementById('theme-toggle');
  if (button) {
    const next = theme === 'dark' ? 'light' : 'dark';
    button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
  }
}

// Puts the theme on <html>, saves the visitor's choice and updates the button
function applyTheme(theme) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-bs-theme', theme);
  themeStore.set(theme);
  updateThemeButton(theme);
}

function initThemeToggle() {
  const button = document.getElementById('theme-toggle');
  if (!button) {
    return;
  }

  // Sync the label with the theme that js/theme.js already applied.
  // Nothing is saved here, so the OS setting is followed until the visitor clicks.
  updateThemeButton(getCurrentTheme());

  button.addEventListener('click', function () {
    const nextTheme = getCurrentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(nextTheme === 'dark' ? 'Dark theme on' : 'Light theme on', 'info');
  });
}

/* ===== Favorites counter and panel list ===== */

// Builds one <li> of the favorites panel for a product
function createFavoriteItem(product) {
  const item = document.createElement('li');
  item.className = 'favorite-item';
  item.dataset.id = product.id;

  const image = document.createElement('img');
  image.src = product.image;
  image.alt = '';

  const info = document.createElement('div');
  info.className = 'favorite-info';
  info.innerHTML = '<span class="favorite-name"></span><span class="favorite-price"></span>';
  info.querySelector('.favorite-name').textContent = product.name;
  info.querySelector('.favorite-price').textContent = formatPrice(product.price);

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'favorite-remove';
  remove.textContent = 'Remove';
  remove.setAttribute('aria-label', 'Remove ' + product.name + ' from favorites');

  item.append(image, info, remove);
  return item;
}

// Redraws the navbar badge and the panel list from localStorage
function renderFavorites() {
  const favoriteIds = getFavorites();
  const count = document.getElementById('favorites-count');
  const list = document.getElementById('favorites-list');
  const empty = document.getElementById('favorites-empty');

  if (count) {
    count.textContent = favoriteIds.length;
    count.classList.toggle('is-empty', favoriteIds.length === 0);
  }

  if (!list) {
    return;
  }

  list.innerHTML = '';
  favoriteIds.forEach(function (id) {
    const product = findProductById(id);
    if (product) {
      list.appendChild(createFavoriteItem(product));
    }
  });

  // The hint is shown only while nothing is saved, the booking link only when something is
  const isEmpty = favoriteIds.length === 0;
  empty.style.display = isEmpty ? 'block' : 'none';
  document.getElementById('favorites-book').style.display = isEmpty ? 'none' : 'block';
}

// Short pop animation on a navbar badge after a change
function bumpBadge(id) {
  const badge = document.getElementById(id);
  if (!badge) {
    return;
  }
  badge.classList.remove('is-bumped');
  void badge.offsetWidth; // restart the CSS animation
  badge.classList.add('is-bumped');
}

/* ===== Cart counter in the navbar ===== */
function renderCartCount() {
  const count = cart.getCount();
  const badge = document.getElementById('cart-count');
  const link = document.getElementById('cart-link');
  if (!badge || !link) {
    return;
  }
  badge.textContent = count;
  badge.classList.toggle('is-empty', count === 0);
  link.setAttribute('aria-label', count === 0 ? 'Cart, empty' : 'Cart, ' + count + (count === 1 ? ' item' : ' items'));
}

/* ===== Keep several open tabs in sync =====
   The "storage" event fires in the OTHER tabs when one tab changes localStorage. */
function initStorageSync() {
  window.addEventListener('storage', function (event) {
    if (event.key === cart.store.key || event.key === null) {
      cart.reload();
    }
    if (event.key === favoritesStore.key || event.key === null) {
      document.dispatchEvent(new CustomEvent('favorites:change'));
    }
  });
}

/* ===== Back-to-top button =====
   The button is not in the HTML: it is created here and added to <body>. */
function initBackToTop() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'back-to-top';
  button.setAttribute('aria-label', 'Back to top');
  button.innerHTML = '<span aria-hidden="true">↑</span>';
  document.body.appendChild(button);

  // Show the button only after the visitor has scrolled down a bit
  window.addEventListener('scroll', function () {
    button.classList.toggle('is-visible', window.scrollY > 600);
  });

  button.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== Heart buttons on product cards (Home and Catalog) ===== */

// Makes every heart on the page match the saved favorites
function syncFavoriteButtons() {
  document.querySelectorAll('.product-card').forEach(function (card) {
    const button = card.querySelector('.favorite-btn');
    const saved = isFavorite(card.dataset.id);
    button.classList.toggle('is-saved', saved);
    button.setAttribute('aria-pressed', String(saved));
  });
}

function initFavoriteButtons() {
  // Cards are created by JavaScript, so one listener on the document catches every heart
  document.addEventListener('click', function (event) {
    const button = event.target.closest('.favorite-btn');
    if (!button) {
      return;
    }

    const card = button.closest('.product-card');
    const product = findProductById(card.dataset.id);
    const saved = toggleFavorite(product.id);

    showToast(saved ? product.name + ' saved to favorites' : product.name + ' removed from favorites', saved ? 'success' : 'info');
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initThemeToggle();
  initFavoriteButtons();
  initBackToTop();
  initStorageSync();
  renderFavorites();
  renderCartCount();

  // toggleFavorite() in utils.js fires this event after every change
  document.addEventListener('favorites:change', function () {
    renderFavorites();
    syncFavoriteButtons();
    bumpBadge('favorites-count');
  });

  // Cart.save() in js/models.js fires this event after every change
  document.addEventListener('cart:change', function () {
    renderCartCount();
    bumpBadge('cart-count');
  });
});
