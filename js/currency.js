/*
  Forma — currency switcher
  Prices in productData are in US dollars. The visitor can choose USD, EUR or KZT
  in the navbar; the choice is saved, and every element with a data-price
  attribute shows its price in that currency with live rates (CurrencyService).
*/

const currencies = {
  USD: 'US dollars',
  EUR: 'euros',
  KZT: 'Kazakhstani tenge'
};

const currencyStore = new LocalStore('forma-currency', 'USD', function (value) {
  return Object.prototype.hasOwnProperty.call(currencies, value);
});
const currencyService = new CurrencyService(new LocalStore('forma-rates', null, isValidRates), 12);

// Saved rates are used straight away, so the first render already has the right prices
const savedRates = currencyService.getSavedRates();
const currencyState = {
  code: currencyStore.get(),
  rates: savedRates ? savedRates.rates : { USD: 1 },
  updatedAt: savedRates ? savedRates.updatedAt : null,
  status: 'idle' // "loading", "success", "stale" or "error"
};

// The chosen currency, or USD while its rate is unknown
function getActiveCurrency() {
  return currencyState.rates[currencyState.code] ? currencyState.code : 'USD';
}

// 1490 (USD) → "$1,490", "€1,354" or "₸662,668"
function formatPrice(amountUsd) {
  const code = getActiveCurrency();
  const value = Math.round(amountUsd * currencyState.rates[code]);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0
  }).format(value);
}

// Rewrites every price on the page: <span data-price="1490">
function refreshPrices() {
  document.querySelectorAll('[data-price]').forEach(function (element) {
    element.textContent = formatPrice(Number(element.dataset.price));
  });
}

// "17 Nov"
function formatShortDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/* ===== Status line under prices (Catalog, Cart): [data-currency-note] ===== */
function getCurrencyNoteText() {
  const code = getActiveCurrency();
  const rate = currencyState.rates[code];

  if (currencyState.status === 'loading') {
    return 'Updating exchange rates…';
  }
  if (currencyState.status === 'error') {
    return 'Live exchange rates are unavailable right now, so prices are shown in US dollars.';
  }
  if (code === 'USD') {
    return 'Prices in US dollars.';
  }

  let text = '1 USD = ' + rate.toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ' + code +
    ', rates from ' + formatShortDate(currencyState.updatedAt) + '.';
  if (currencyState.status === 'stale') {
    text += ' Could not update them just now.';
  }
  return text;
}

function renderCurrencyNotes() {
  const text = getCurrencyNoteText();
  const showRetry = currencyState.status === 'error' || currencyState.status === 'stale';

  document.querySelectorAll('[data-currency-note]').forEach(function (note) {
    note.textContent = text + ' ';
    note.classList.toggle('is-error', currencyState.status === 'error');
    if (showRetry) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'link-button';
      retry.dataset.currencyRetry = '';
      retry.textContent = 'Try again';
      note.appendChild(retry);
    }
  });
}

// Puts the current state on the page and tells other scripts (e.g. the cart page)
function applyCurrency() {
  const select = document.getElementById('currency-select');
  if (select) {
    select.value = getActiveCurrency();
  }
  refreshPrices();
  renderCurrencyNotes();
  document.dispatchEvent(new CustomEvent('currency:change'));
}

// Asks CurrencyService for rates (from localStorage or the API)
async function loadRates() {
  currencyState.status = 'loading';
  renderCurrencyNotes();

  try {
    const result = await currencyService.getRates(['EUR', 'KZT']);
    currencyState.rates = result.rates;
    currencyState.updatedAt = result.updatedAt;
    currencyState.status = 'success';
  } catch (error) {
    // Old saved rates are better than nothing; without them we fall back to USD
    currencyState.status = currencyState.rates.EUR ? 'stale' : 'error';
  }

  applyCurrency();
  return currencyState.status;
}

async function changeCurrency(code) {
  currencyState.code = code;
  currencyStore.set(code);

  if (!currencyState.rates[code]) {
    const status = await loadRates();
    if (status === 'error' && code !== 'USD') {
      showToast('Could not load exchange rates, prices stay in US dollars', 'info');
    }
    return;
  }

  applyCurrency();
  showToast('Prices are now in ' + currencies[code], 'info');
}

document.addEventListener('DOMContentLoaded', function () {
  const select = document.getElementById('currency-select');
  if (select) {
    select.addEventListener('change', function (event) {
      changeCurrency(event.target.value);
    });
  }

  // "Try again" buttons are created inside the notes, so the click is delegated
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-currency-retry]')) {
      loadRates();
    }
  });

  applyCurrency();
  loadRates();
});
