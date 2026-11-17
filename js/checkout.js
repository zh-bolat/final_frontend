/*
  Forma — checkout on the Cart page
  A form in three steps: contact → delivery → review.
  • the address fields depend on the delivery method, the lift question on the floor
  • the earliest date depends on the slowest piece in the cart and on express delivery
  • the order total is calculated live from the cart and the chosen options
*/

const checkoutForm = document.getElementById('checkout-form');
const checkoutSteps = checkoutForm.querySelectorAll('.checkout-step');
const orderFields = checkoutForm.elements;

const LAST_STEP = 3;
const MAX_ORDER_DAYS = 60;      // orders can be planned up to 60 days ahead
const PICKUP_DISCOUNT = 0.05;   // 5% off when the order is picked up
const EXPRESS_FEE = 49;         // USD
const CARRY_FEE_PER_FLOOR = 5;  // USD for each piece and floor without a lift

let currentStep = 1;

/* ===== Calculated values ===== */

function isPickup() {
  return orderFields.method.value === 'pickup';
}

function isExpress() {
  return !isPickup() && orderFields.express.checked;
}

// Days until the order can arrive: the slowest piece, express halves it
function getDaysNeeded() {
  const longest = cart.getLongestDelivery();
  return isExpress() ? Math.ceil(longest / 2) : longest;
}

function getEarliestDate() {
  return getDayFromToday(Math.max(getDaysNeeded(), 1));
}

// Floors to carry up by hand: 0 with a lift or on the first floor
function getFloorsToCarry() {
  const floor = Number(orderFields.floor.value);
  if (isPickup() || orderFields.elevator.checked || !Number.isInteger(floor) || floor < 2) {
    return 0;
  }
  return Math.min(floor, 40) - 1;
}

// Every amount of the order in US dollars
function calculateOrder() {
  const subtotal = cart.getSubtotal();
  const discount = isPickup() ? Math.round(subtotal * PICKUP_DISCOUNT) : 0;
  const carryFee = getFloorsToCarry() * CARRY_FEE_PER_FLOOR * cart.getCount();
  const expressFee = isExpress() ? EXPRESS_FEE : 0;

  return {
    subtotal: subtotal,
    discount: discount,
    carryFee: carryFee,
    expressFee: expressFee,
    total: subtotal - discount + carryFee + expressFee
  };
}

/* ===== Checks for this form (name, email and phone come from js/validation.js) ===== */
function validateDistrict(value) {
  return value === '' ? 'Please choose your district.' : '';
}

function validateAddress(value) {
  const address = value.trim();
  if (address.length < 6) {
    return 'Please enter the street, house and flat.';
  }
  if (!/\d/.test(address)) {
    return 'Add the house number, e.g. Kabanbay Batyr 15.';
  }
  return '';
}

function validateFloor(value) {
  const floor = Number(value);
  if (value === '' || !Number.isInteger(floor) || floor < 1 || floor > 40) {
    return 'Enter a floor from 1 to 40.';
  }
  return '';
}

function validateOrderDate(value) {
  if (value === '') {
    return isPickup() ? 'Please choose a pickup date.' : 'Please choose a delivery date.';
  }
  const chosen = new Date(value + 'T00:00:00');
  const earliest = getEarliestDate();
  if (chosen < earliest) {
    return 'The earliest possible date is ' + formatLongDate(toInputDate(earliest)) + '.';
  }
  if (chosen > getDayFromToday(MAX_ORDER_DAYS)) {
    return 'We plan orders up to ' + MAX_ORDER_DAYS + ' days ahead.';
  }
  return '';
}

function validateNotes(value) {
  return value.trim().length > 300 ? 'Please keep the notes under 300 characters.' : '';
}

function validatePayment(value) {
  return value === '' ? 'Please choose how you would like to pay.' : '';
}

function validateTerms(checked) {
  return checked ? '' : 'Please confirm the order.';
}

const checkoutValidator = new FormValidator(checkoutForm, {
  name: validateName,
  email: validateEmail,
  phone: validateRequiredPhone,
  district: validateDistrict,
  address: validateAddress,
  floor: validateFloor,
  date: validateOrderDate,
  notes: validateNotes,
  payment: validatePayment,
  terms: validateTerms
});

/* ===== Dependent fields ===== */

// Pickup hides and disables the address (disabled fields are not checked)
function updateMethodFields() {
  const pickup = isPickup();
  const addressFields = document.getElementById('address-fields');
  addressFields.hidden = pickup;
  addressFields.disabled = pickup;

  document.getElementById('order-date-label').textContent = pickup ? 'Pickup date' : 'Delivery date';
  document.getElementById('elevator-wrap').hidden = Number(orderFields.floor.value) < 2;
}

// The date picker greys out days that are too early or too late
function updateDateLimits() {
  const earliest = getEarliestDate();
  orderFields.date.min = toInputDate(earliest);
  orderFields.date.max = toInputDate(getDayFromToday(MAX_ORDER_DAYS));

  const days = getDaysNeeded();
  let hint = 'Earliest: ' + formatLongDate(toInputDate(earliest)) + '.';
  if (days > 0) {
    hint += isExpress()
      ? ' Express delivery needs ' + days + (days === 1 ? ' day.' : ' days.')
      : ' The slowest piece in your cart needs ' + days + (days === 1 ? ' day.' : ' days.');
  }
  document.getElementById('order-date-hint').textContent = hint;

  // A date chosen before may not be valid any more
  if (orderFields.date.value !== '') {
    checkoutValidator.validateField(orderFields.date);
  }
}

function setPriceText(element, amountUsd) {
  element.dataset.price = amountUsd;
  element.textContent = formatPrice(amountUsd);
}

function renderLiveTotal() {
  setPriceText(document.getElementById('checkout-total'), calculateOrder().total);
}

/* ===== Step 3: review list and totals ===== */
function createReviewRow(label, value, className) {
  const row = document.createElement('li');
  if (className) {
    row.className = className;
  }
  row.innerHTML = '<span></span><span></span>';
  row.firstChild.textContent = label;
  row.lastChild.textContent = value;
  return row;
}

function renderReview() {
  const list = document.getElementById('review-list');
  const totals = document.getElementById('review-totals');
  const order = calculateOrder();

  const pieces = cart.getLines().map(function (line) {
    return line.quantity + ' × ' + line.product.name;
  }).join(', ');

  list.innerHTML = '';
  list.append(
    createReviewRow('Name', orderFields.name.value.trim()),
    createReviewRow('Contact', orderFields.email.value.trim() + ', ' + orderFields.phone.value.trim()),
    createReviewRow(isPickup() ? 'Pickup' : 'Delivery', isPickup()
      ? 'Forma showroom, 12 Example Avenue'
      : orderFields.district.value + ', ' + orderFields.address.value.trim() + ', floor ' + orderFields.floor.value),
    createReviewRow('Date', orderFields.date.value ? formatLongDate(orderFields.date.value) : '—'),
    createReviewRow('Pieces', pieces)
  );

  totals.innerHTML = '';
  const rows = [
    ['Subtotal', order.subtotal],
    ['Pickup discount (5%)', -order.discount],
    ['Carrying up ' + getFloorsToCarry() + ' floors', order.carryFee],
    ['Express delivery', order.expressFee]
  ];
  rows.forEach(function (row) {
    if (row[1] !== 0 || row[0] === 'Subtotal') {
      const item = createReviewRow(row[0], '');
      const value = item.lastChild;
      if (row[1] < 0) {
        value.textContent = '−' + formatPrice(-row[1]);
      } else {
        setPriceText(value, row[1]);
      }
      totals.appendChild(item);
    }
  });
  const totalRow = createReviewRow('Total', '', 'summary-total');
  setPriceText(totalRow.lastChild, order.total);
  totals.appendChild(totalRow);
}

/* ===== Moving between steps ===== */
function showStep(step) {
  currentStep = step;

  checkoutSteps.forEach(function (fieldset) {
    fieldset.hidden = Number(fieldset.dataset.step) !== step;
  });

  document.querySelectorAll('#checkout-steps .step').forEach(function (item) {
    const itemStep = Number(item.dataset.step);
    item.classList.toggle('is-active', itemStep === step);
    item.classList.toggle('is-done', itemStep < step);
    if (itemStep === step) {
      item.setAttribute('aria-current', 'step');
    } else {
      item.removeAttribute('aria-current');
    }
  });

  document.getElementById('checkout-back').hidden = step === 1;
  document.getElementById('checkout-next').hidden = step === LAST_STEP;
  document.getElementById('checkout-submit').hidden = step !== LAST_STEP;

  if (step === LAST_STEP) {
    renderReview();
  }
}

function getStepFieldset(step) {
  return checkoutForm.querySelector('.checkout-step[data-step="' + step + '"]');
}

// Moves to another step and puts the focus on its title
function goToStep(step) {
  showStep(step);
  saveDraft(); // the step is part of the draft
  const title = getStepFieldset(step).querySelector('.step-title');
  title.focus({ preventScroll: true });
  const top = $('#checkout').offset().top - $('.site-header').outerHeight();
  if (window.scrollY > top) {
    $('html, body').animate({ scrollTop: top }, 300);
  }
}

// "Continue": only when every field of the current step is fine
function nextStep() {
  const fieldset = getStepFieldset(currentStep);
  const errorCount = checkoutValidator.validateAll(fieldset);
  if (errorCount > 0) {
    checkoutValidator.focusFirstError(fieldset);
    showToast('Please fix ' + errorCount + (errorCount === 1 ? ' field' : ' fields') + ' first', 'info');
    return;
  }
  goToStep(currentStep + 1);
}

// Locks the form while the cart is empty
function updateCheckoutLock() {
  const isEmpty = cart.isEmpty();
  checkoutForm.hidden = isEmpty;
  document.getElementById('checkout-steps').hidden = isEmpty;
  document.getElementById('checkout-locked').hidden = !isEmpty;
}

// Everything that depends on the cart or on the options
function refreshCheckout() {
  updateCheckoutLock();
  updateMethodFields();
  updateDateLimits();
  renderLiveTotal();
  if (currentStep === LAST_STEP) {
    renderReview();
  }
}

/* ===== Draft: the form is saved in localStorage while the visitor types =====
   Saved: { step: 2, values: { name: "...", method: "delivery", express: true, ... } }
   The terms checkbox is never saved: the visitor confirms each order again. */
const DRAFT_FIELDS = ['name', 'email', 'phone', 'method', 'district', 'address', 'floor', 'elevator', 'express', 'date', 'notes', 'payment'];

const draftStore = new LocalStore('forma-checkout-draft', null, function (value) {
  return isPlainObject(value) && isPlainObject(value.values) && Number.isInteger(value.step);
});

function saveDraft() {
  const values = {};
  DRAFT_FIELDS.forEach(function (name) {
    const field = orderFields[name];
    values[name] = field.type === 'checkbox' ? field.checked : field.value;
  });
  draftStore.set({ step: currentStep, values: values });
}

// Puts saved values back; anything of the wrong type is skipped
function restoreDraft() {
  const draft = draftStore.get();
  if (draft === null) {
    return 1;
  }

  DRAFT_FIELDS.forEach(function (name) {
    const value = draft.values[name];
    const field = orderFields[name];
    if (field.type === 'checkbox' && typeof value === 'boolean') {
      field.checked = value;
    } else if (field.type !== 'checkbox' && typeof value === 'string') {
      field.value = value; // for the radio group this checks the matching radio
    }
  });

  if (!orderFields.method.value) {
    orderFields.method.value = 'delivery';
  }
  return Math.min(Math.max(draft.step, 1), LAST_STEP);
}

function clearDraft() {
  draftStore.clear();
}

document.addEventListener('DOMContentLoaded', function () {
  checkoutValidator.watch();
  const savedStep = restoreDraft();
  showStep(savedStep);
  refreshCheckout();
  if (savedStep > 1 && !cart.isEmpty()) {
    showToast('We restored your checkout details', 'info');
  }

  // Every change is saved at once, so a reload loses nothing
  checkoutForm.addEventListener('input', saveDraft);
  checkoutForm.addEventListener('change', saveDraft);

  // Forgets the saved draft and starts again from step 1
  document.getElementById('checkout-reset').addEventListener('click', function () {
    checkoutForm.reset();
    checkoutValidator.clear();
    goToStep(1);
    refreshCheckout();
    clearDraft();
    showToast('The checkout form is empty again', 'info');
  });

  document.getElementById('checkout-next').addEventListener('click', nextStep);
  document.getElementById('checkout-back').addEventListener('click', function () {
    goToStep(currentStep - 1);
  });

  // Any change of method, floor, lift or express changes fields, dates or totals
  checkoutForm.addEventListener('change', function (event) {
    const name = event.target.name;
    if (name === 'method' || name === 'floor' || name === 'elevator' || name === 'express') {
      refreshCheckout();
    }
  });
  orderFields.floor.addEventListener('input', function () {
    updateMethodFields();
    renderLiveTotal();
  });

  // Enter in a text field of step 1 or 2 means "Continue", not "Place order"
  checkoutForm.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' && event.target.tagName === 'INPUT' && currentStep < LAST_STEP) {
      event.preventDefault();
      nextStep();
    }
  });

  document.addEventListener('cart:change', refreshCheckout);
  document.addEventListener('currency:change', function () {
    if (currentStep === LAST_STEP) {
      renderReview();
    }
  });
});
