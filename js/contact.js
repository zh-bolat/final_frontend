/*
  Forma — Contact page
  Checks the booking form with our own rules and messages.
*/

const bookingForm = document.getElementById('booking-form');

const MAX_MESSAGE_LENGTH = 500;
const MAX_DAYS_AHEAD = 60;

/* ===== Checks for this form =====
   Name, email and phone checks are shared with the checkout form (js/validation.js).
   Each function returns an error message, or an empty string when the value is fine. */
function validateDate(value) {
  if (value === '') {
    return 'Please choose a date for your visit.';
  }

  const chosen = new Date(value + 'T00:00:00');
  const today = getToday();
  const lastDay = getDayFromToday(MAX_DAYS_AHEAD);

  if (chosen < today) {
    return 'This date has already passed.';
  }
  if (chosen > lastDay) {
    return 'We take bookings up to ' + MAX_DAYS_AHEAD + ' days ahead.';
  }
  return '';
}

function validateGuests(value) {
  if (value === '') {
    return 'Please tell us how many people are coming.';
  }
  const guests = Number(value);
  if (!Number.isInteger(guests) || guests < 1 || guests > 6) {
    return 'Our showroom tours are for 1 to 6 guests.';
  }
  return '';
}

function validateTopic(value) {
  return value === '' ? 'Please choose what you would like to see.' : '';
}

function validateMessage(value, form) {
  const message = value.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    return 'Please keep the message under ' + MAX_MESSAGE_LENGTH + ' characters.';
  }
  // A custom order needs a few details so the designer can prepare
  const topic = form.elements.topic.value;
  if (topic === 'custom' && message.length < 20) {
    return 'For a custom order, describe the piece in at least 20 characters.';
  }
  return '';
}

function validateConsent(checked) {
  return checked ? '' : 'Please agree so we can contact you about the visit.';
}

// Field name → its check. The keys match the name="" attributes in the HTML.
// FormValidator (js/validation.js) shows the messages under the fields.
const bookingValidator = new FormValidator(bookingForm, {
  name: validateName,
  email: validateEmail,
  phone: validatePhone,
  date: validateDate,
  guests: validateGuests,
  topic: validateTopic,
  message: validateMessage,
  consent: validateConsent
});

/* ===== Character counter under the message ===== */
function updateCharCounter() {
  const length = bookingForm.elements.message.value.length;
  const counter = document.getElementById('visit-message-counter');
  counter.textContent = length + ' / ' + MAX_MESSAGE_LENGTH;

  // Orange when fewer than 50 characters are left
  counter.classList.toggle('is-near-limit', length > MAX_MESSAGE_LENGTH - 50);
}

/* ===== Favorites from the catalog, shown inside the form ===== */
function renderBookingFavorites() {
  const wrap = document.getElementById('booking-favorites-wrap');
  const list = document.getElementById('booking-favorites');
  const names = getFavoriteNames();

  list.innerHTML = '';
  for (const name of names) {
    const item = document.createElement('li');
    item.textContent = name;
    list.appendChild(item);
  }
  wrap.hidden = names.length === 0;
}

// Returns the names of the saved products, e.g. ["Nord sofa", "Kai dining chair"]
function getFavoriteNames() {
  const names = [];
  getFavorites().forEach(function (id) {
    const product = findProductById(id);
    if (product) {
      names.push(product.name);
    }
  });
  return names;
}

/* ===== Submitting ===== */

// Builds the confirmation card shown instead of the form
function createSuccessMessage(form) {
  const data = form.elements;
  const topicText = data.topic.options[data.topic.selectedIndex].text;
  const firstName = data.name.value.trim().split(/\s+/)[0];
  const guests = Number(data.guests.value);

  const box = document.createElement('div');
  box.className = 'form-success';
  box.setAttribute('role', 'status');
  box.setAttribute('tabindex', '-1');
  box.innerHTML = `
    <span class="success-icon" aria-hidden="true">✓</span>
    <h3 class="success-title"></h3>
    <p class="success-text"></p>
    <ul class="success-summary">
      <li><span>Date</span><span class="summary-date"></span></li>
      <li><span>Guests</span><span class="summary-guests"></span></li>
      <li><span>Topic</span><span class="summary-topic"></span></li>
      <li class="summary-pieces-row"><span>Pieces to prepare</span><span class="summary-pieces"></span></li>
    </ul>
    <button class="btn btn-soft btn-small" type="button" id="book-again">Book another visit</button>`;

  // textContent (not innerHTML) for anything the visitor typed
  box.querySelector('.success-title').textContent = 'Thank you, ' + firstName + '!';
  box.querySelector('.success-text').textContent =
    'Your visit is booked. We will send a confirmation to ' + data.email.value.trim() + ' within one working day.';
  box.querySelector('.summary-date').textContent = formatLongDate(data.date.value);
  box.querySelector('.summary-guests').textContent = guests + (guests === 1 ? ' person' : ' people');
  box.querySelector('.summary-topic').textContent = topicText;

  const pieces = getFavoriteNames();
  if (pieces.length > 0) {
    box.querySelector('.summary-pieces').textContent = pieces.join(', ');
  } else {
    box.querySelector('.summary-pieces-row').remove();
  }
  return box;
}

// Clears the form and every message so a new booking can start
function resetBookingForm(form) {
  form.reset();
  bookingValidator.clear();
  updateCharCounter();
}

document.addEventListener('DOMContentLoaded', function () {
  bookingForm.addEventListener('submit', function (event) {
    event.preventDefault(); // never reload the page; we decide what happens

    const errorCount = bookingValidator.validateAll();
    if (errorCount > 0) {
      // Move the visitor to the first field that needs attention
      bookingValidator.focusFirstError();
      showToast('Please fix ' + errorCount + (errorCount === 1 ? ' field' : ' fields') + ' in the form', 'info');
      return;
    }

    // All good: replace the form with a confirmation
    const success = createSuccessMessage(bookingForm);
    bookingForm.hidden = true;
    bookingForm.after(success);
    success.focus();
    showToast('Visit booked!');
  });

  // "Book another visit" removes the confirmation and brings back an empty form
  bookingForm.parentElement.addEventListener('click', function (event) {
    if (event.target.id !== 'book-again') {
      return;
    }
    event.target.closest('.form-success').remove();
    resetBookingForm(bookingForm);
    bookingForm.hidden = false;
    bookingForm.elements.name.focus();
  });

  bookingForm.elements.message.addEventListener('input', updateCharCounter);

  renderBookingFavorites();
  document.addEventListener('favorites:change', renderBookingFavorites);

  // The date picker starts at today, so past days are greyed out
  bookingForm.elements.date.min = toInputDate(getToday());

  // Checks on blur and while typing (see FormValidator.watch)
  bookingValidator.watch();

  // The topic changes the message rule (custom orders need details)
  bookingForm.elements.topic.addEventListener('change', function () {
    const message = bookingForm.elements.message;
    if (message.classList.contains('is-invalid') || message.value !== '') {
      bookingValidator.validateField(message);
    }
  });
});
