/*
  Forma — form validation shared by the booking form (Contact)
  and the checkout form (Cart).
  The small check functions return an error message or '' when the value is fine.
  The FormValidator class connects such checks to the fields of one form.
*/

/* ===== Small helpers ===== */
function isValidEmail(value) {
  // something@something.domain, no spaces
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function countDigits(value) {
  return value.replace(/\D/g, '').length;
}

// Today at 00:00, so a date "today" still counts as valid
function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// A date in N days, at 00:00
function getDayFromToday(days) {
  const day = getToday();
  day.setDate(day.getDate() + days);
  return day;
}

// Date object → "2026-11-20", the format of <input type="date"> (local time, not UTC)
function toInputDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return date.getFullYear() + '-' + month + '-' + day;
}

// "2026-11-20" → "Friday 20 November"
function formatLongDate(value) {
  const date = new Date(value + 'T00:00:00');
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

/* ===== Checks used by both forms ===== */
function validateName(value) {
  const name = value.trim();
  if (name === '') {
    return 'Please enter your full name.';
  }
  if (!/^[\p{L}\s'-]+$/u.test(name)) {
    return 'Use letters only — no numbers or symbols.';
  }
  if (name.split(/\s+/).length < 2) {
    return 'Please enter both your first and last name.';
  }
  return '';
}

function validateEmail(value) {
  const email = value.trim();
  if (email === '') {
    return 'Please enter your email so we can confirm it.';
  }
  if (!isValidEmail(email)) {
    return 'This email looks incomplete, e.g. name@example.com.';
  }
  return '';
}

// Optional phone: empty is fine, otherwise 11 digits
function validatePhone(value) {
  const phone = value.trim();
  if (phone === '') {
    return '';
  }
  if (!/^\+?[\d\s()-]+$/.test(phone)) {
    return 'Use digits, spaces, brackets or dashes only.';
  }
  if (countDigits(phone) !== 11) {
    return 'A Kazakhstan number has 11 digits, e.g. +7 700 000 00 00.';
  }
  return '';
}

// The same rule, but the phone must be filled in (the courier calls before delivery)
function validateRequiredPhone(value) {
  if (value.trim() === '') {
    return 'Please enter a phone number for the courier.';
  }
  return validatePhone(value);
}

/*
  FormValidator class
  rules is an object: field name → check function (value, form) → message.
  Example:
    const validator = new FormValidator(form, { name: validateName, email: validateEmail });
    validator.validateAll();   // number of fields with errors
*/
class FormValidator {
  constructor(form, rules) {
    this.form = form;
    this.rules = rules;
  }

  // Checkboxes give true/false, every other field gives its text value
  getValue(field) {
    return field.type === 'checkbox' ? field.checked : field.value;
  }

  // The first id in aria-describedby is the error box, e.g. "visit-name-error"
  getErrorBox(field) {
    const ids = (field.getAttribute('aria-describedby') || '').split(' ');
    return document.getElementById(ids[0]);
  }

  // Writes the message under the field and colors its border.
  // Optional empty fields stay neutral instead of turning green.
  showResult(field, message) {
    const errorBox = this.getErrorBox(field);
    if (errorBox) {
      errorBox.textContent = message;
    }
    const isEmptyOptional = !field.required && field.value.trim() === '';
    field.classList.toggle('is-invalid', message !== '');
    field.classList.toggle('is-valid', message === '' && !isEmptyOptional && field.type !== 'checkbox');
    field.setAttribute('aria-invalid', String(message !== ''));
  }

  // Checks one field; returns true when it is valid (fields without a rule are always valid)
  validateField(field) {
    const check = this.rules[field.name];
    if (!check || field.disabled) {
      return true;
    }
    const message = check(this.getValue(field), this.form);
    this.showResult(field, message);
    return message === '';
  }

  // Checks every field inside container (the whole form by default).
  // Every field is checked, not only the first wrong one. Returns the number of errors.
  validateAll(container) {
    let errorCount = 0;
    const fields = (container || this.form).querySelectorAll('input, select, textarea');
    for (const field of fields) {
      if (field.name && !this.validateField(field)) {
        errorCount++;
      }
    }
    return errorCount;
  }

  // Moves the cursor to the first field with an error inside container
  focusFirstError(container) {
    const field = (container || this.form).querySelector('.is-invalid');
    if (field) {
      field.focus();
    }
  }

  // Removes every message and color, e.g. after form.reset()
  clear() {
    this.form.querySelectorAll('.is-valid, .is-invalid').forEach(function (field) {
      field.classList.remove('is-valid', 'is-invalid');
      field.removeAttribute('aria-invalid');
    });
    this.form.querySelectorAll('.field-error').forEach(function (box) {
      box.textContent = '';
    });
  }

  // Live checking: on blur after typing, and while typing once a field was checked
  watch() {
    const validator = this;
    this.form.querySelectorAll('input, select, textarea').forEach(function (field) {
      if (field.type === 'checkbox' || field.type === 'radio') {
        field.addEventListener('change', function () {
          validator.validateField(field);
        });
        return;
      }

      field.addEventListener('blur', function () {
        if (field.value !== '' || field.classList.contains('is-invalid')) {
          validator.validateField(field);
        }
      });

      field.addEventListener('input', function () {
        if (field.classList.contains('is-invalid') || field.classList.contains('is-valid')) {
          validator.validateField(field);
        }
      });
    });
  }
}
