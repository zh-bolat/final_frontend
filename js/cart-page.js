/*
  Forma — Cart page
  Shows the items of the Cart object (js/models.js) and lets the visitor
  change quantities (update), remove one product or clear the cart (delete).
  Adding (create) happens on the product cards of Home and Catalog.
*/

const cartList = document.getElementById('cart-list');
const cartEmpty = document.getElementById('cart-empty');
const clearButton = document.getElementById('cart-clear');

// Builds one <li> for a cart line: { product, quantity, total }
function createCartItem(line) {
  const product = line.product;
  const item = document.createElement('li');
  item.className = 'cart-item';
  item.dataset.id = product.id;

  item.innerHTML = `
    <img class="cart-item-img" src="${product.image}" alt="" loading="lazy">
    <div class="cart-item-info">
      <h3 class="cart-item-name">${product.name}</h3>
      <p class="cart-item-meta">${product.category} · ${product.material} · ready in ${product.getDeliveryText()}</p>
      <p class="cart-item-meta"><span data-price="${product.price}">${formatPrice(product.price)}</span> each</p>
    </div>
    <div class="quantity" role="group" aria-label="Quantity of ${product.name}">
      <button class="qty-btn" type="button" data-action="decrease" aria-label="One less ${product.name}"${line.quantity <= 1 ? ' disabled' : ''}>−</button>
      <input class="qty-input" type="number" inputmode="numeric" min="1" max="${cart.maxQuantity}" value="${line.quantity}" aria-label="Quantity of ${product.name}">
      <button class="qty-btn" type="button" data-action="increase" aria-label="One more ${product.name}"${line.quantity >= cart.maxQuantity ? ' disabled' : ''}>+</button>
    </div>
    <span class="cart-item-total price" data-price="${line.total}">${formatPrice(line.total)}</span>
    <button class="cart-remove" type="button" aria-label="Remove ${product.name} from cart">&times;</button>`;

  return item;
}

// Writes a USD amount into an element and keeps data-price for currency changes
function setPrice(element, amountUsd) {
  element.dataset.price = amountUsd;
  element.textContent = formatPrice(amountUsd);
}

function renderSummary() {
  const subtotal = cart.getSubtotal();
  const longest = cart.getLongestDelivery();

  document.getElementById('summary-count').textContent = cart.getCount();
  setPrice(document.getElementById('summary-subtotal'), subtotal);
  setPrice(document.getElementById('summary-total'), subtotal);
  document.getElementById('summary-ready').textContent = longest === 0 ? '—' : longest + (longest === 1 ? ' day' : ' days');
  document.getElementById('go-checkout').hidden = cart.isEmpty();
}

// Redraws the list. The focused control is remembered and focused again,
// so keyboard users do not lose their place after pressing + or −.
function renderCart() {
  const active = document.activeElement;
  const activeItem = active && active.closest ? active.closest('.cart-item') : null;
  let focusSelector = null;
  if (activeItem && cartList.contains(activeItem)) {
    const part = active.dataset.action ? '[data-action="' + active.dataset.action + '"]' : '.' + active.classList[0];
    focusSelector = '[data-id="' + activeItem.dataset.id + '"] ' + part;
  }

  cartList.innerHTML = '';
  cart.getLines().forEach(function (line) {
    cartList.appendChild(createCartItem(line));
  });

  const isEmpty = cart.isEmpty();
  cartEmpty.hidden = !isEmpty;
  cartList.hidden = isEmpty;
  clearButton.hidden = isEmpty;
  resetClearButton();
  renderSummary();

  if (focusSelector) {
    const target = cartList.querySelector(focusSelector);
    if (target && !target.disabled) {
      target.focus();
    }
  }
}

/* ===== Update: quantity buttons and the number field ===== */
function changeQuantity(productId, quantity) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    showToast('Quantity must be a whole number from 1 to ' + cart.maxQuantity, 'info');
    renderCart(); // puts the old value back into the field
    return;
  }
  if (quantity > cart.maxQuantity) {
    showToast('You can order up to ' + cart.maxQuantity + ' of one model', 'info');
  }
  cart.setQuantity(productId, quantity); // the Cart class limits it to maxQuantity
}

/* ===== Delete: one product, with a jQuery slide ===== */
function removeItem(item) {
  const productId = item.dataset.id;
  const name = Cart.findProduct(productId).name;

  $(item).slideUp(200, function () {
    cart.remove(productId); // fires cart:change, the list is drawn again
    showToast(name + ' removed from cart', 'info');
  });
}

/* ===== Delete: the whole cart, after a second click =====
   (a browser confirm() dialog would block the page, so the button asks itself) */
let clearTimer = null;

function resetClearButton() {
  clearTimeout(clearTimer);
  clearButton.classList.remove('is-confirming');
  clearButton.textContent = 'Clear cart';
}

function handleClearClick() {
  if (!clearButton.classList.contains('is-confirming')) {
    clearButton.classList.add('is-confirming');
    clearButton.textContent = 'Click again to remove everything';
    clearTimer = setTimeout(resetClearButton, 4000);
    return;
  }
  cart.clear();
  showToast('Your cart is empty now', 'info');
  document.getElementById('cart-empty').querySelector('a').focus();
}

document.addEventListener('DOMContentLoaded', function () {
  renderCart();

  // One listener for every button inside the list (event delegation)
  cartList.addEventListener('click', function (event) {
    const item = event.target.closest('.cart-item');
    if (!item) {
      return;
    }
    const productId = item.dataset.id;

    if (event.target.closest('.cart-remove')) {
      removeItem(item);
      return;
    }

    const button = event.target.closest('.qty-btn');
    if (button) {
      const step = button.dataset.action === 'increase' ? 1 : -1;
      changeQuantity(productId, cart.getQuantity(productId) + step);
    }
  });

  // "change" fires when the visitor leaves the field or presses Enter
  cartList.addEventListener('change', function (event) {
    if (event.target.classList.contains('qty-input')) {
      const productId = event.target.closest('.cart-item').dataset.id;
      changeQuantity(productId, Number(event.target.value));
    }
  });

  clearButton.addEventListener('click', handleClearClick);

  // Changes from product pages in other tabs, or from this page
  document.addEventListener('cart:change', renderCart);
  // Totals are drawn again in the new currency
  document.addEventListener('currency:change', renderSummary);
});
