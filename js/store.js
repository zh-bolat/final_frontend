/*
  Forma — LocalStore class
  One LocalStore object takes care of one localStorage key.
  It turns values into JSON when saving, parses them when reading,
  and never lets broken or unexpected data reach the rest of the code.

  Example:
    const favoritesStore = new LocalStore('forma-favorites', [], Array.isArray);
    favoritesStore.get();          // [] the first time
    favoritesStore.set(['nord-sofa']);
    favoritesStore.clear();
*/
class LocalStore {
  // key      — the name in localStorage
  // fallback — value returned when nothing valid is saved
  // isValid  — optional function that checks the parsed value (returns true or false)
  constructor(key, fallback, isValid) {
    this.key = key;
    this.fallback = fallback;
    this.isValid = isValid || function () {
      return true;
    };
  }

  // Returns the saved value, or a fresh copy of the fallback
  get() {
    let saved = null;
    try {
      saved = localStorage.getItem(this.key);
    } catch (error) {
      return this.getFallback(); // storage is blocked (private mode, cookies off)
    }

    if (saved === null) {
      return this.getFallback();
    }

    try {
      const value = JSON.parse(saved);
      if (this.isValid(value)) {
        return value;
      }
    } catch (error) {
      // Not valid JSON: handled below like any other broken value
    }

    // Broken or outdated data is removed, so it cannot cause errors again
    this.clear();
    return this.getFallback();
  }

  // Saves the value as JSON; returns false when the browser refused
  set(value) {
    try {
      localStorage.setItem(this.key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false; // the page still works, it just will not remember the value
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch (error) {
      // Nothing to remove when storage is blocked
    }
  }

  // A copy, so changing the returned array never changes the fallback itself
  getFallback() {
    return this.fallback === null || typeof this.fallback !== 'object'
      ? this.fallback
      : JSON.parse(JSON.stringify(this.fallback));
  }
}

/* ===== Small checks used by the stores ===== */
function isStringArray(value) {
  return Array.isArray(value) && value.every(function (item) {
    return typeof item === 'string';
  });
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
