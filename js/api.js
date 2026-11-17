/*
  Forma — classes that talk to external APIs
  Both APIs are free and public, they need no key, so nothing secret is in the code:
    • open.er-api.com — exchange rates (USD → EUR, KZT)
    • api.open-meteo.com — weather forecast for the showroom (see WeatherService below)
*/

/* ===== ApiError — an error with a message we can show to the visitor ===== */
class ApiError extends Error {
  // kind: "network", "timeout", "http" or "data"
  constructor(message, kind) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
  }
}

/* ===== ApiService — the base class for every API =====
   It builds the URL, waits for fetch() with a time limit and turns every
   kind of failure into an ApiError with a readable message. */
class ApiService {
  constructor(baseUrl, timeoutMs) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs || 8000;
  }

  // "forecast", { latitude: 51.1 } → "https://.../forecast?latitude=51.1"
  buildUrl(path, params) {
    const url = new URL(path, this.baseUrl);
    Object.entries(params || {}).forEach(function ([name, value]) {
      url.searchParams.set(name, value);
    });
    return url.toString();
  }

  // Returns the parsed JSON or throws an ApiError
  async getJson(path, params) {
    // AbortController stops the request when it takes longer than timeoutMs
    const controller = new AbortController();
    const timer = setTimeout(function () {
      controller.abort();
    }, this.timeoutMs);

    let response;
    try {
      response = await fetch(this.buildUrl(path, params), { signal: controller.signal });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('The server took too long to answer.', 'timeout');
      }
      throw new ApiError('No connection to the server. Check your internet and try again.', 'network');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new ApiError('The server answered with error ' + response.status + '.', 'http');
    }

    try {
      return await response.json();
    } catch (error) {
      throw new ApiError('The server sent data we could not read.', 'data');
    }
  }
}

/* ===== CurrencyService — exchange rates from open.er-api.com =====
   Rates change once a day, so they are kept in localStorage and
   asked for again only when the saved copy is older than maxAgeHours. */
class CurrencyService extends ApiService {
  constructor(store, maxAgeHours) {
    super('https://open.er-api.com/v6/', 8000);
    this.store = store;
    this.maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  }

  // The last saved rates (may be old) or null
  getSavedRates() {
    return this.store.get();
  }

  isFresh(saved) {
    return saved !== null && Date.now() - saved.fetchedAt < this.maxAgeMs;
  }

  // Returns { rates: { USD: 1, EUR: 0.91, KZT: 444.7 }, updatedAt, fetchedAt }
  async getRates(codes) {
    const saved = this.getSavedRates();
    if (this.isFresh(saved)) {
      return saved;
    }

    const data = await this.getJson('latest/USD');
    if (!data || data.result !== 'success' || !isPlainObject(data.rates)) {
      throw new ApiError('The exchange rate service sent an unexpected answer.', 'data');
    }

    // Keep only the currencies the site uses, and check that each one is a real number
    const rates = { USD: 1 };
    codes.forEach(function (code) {
      const rate = data.rates[code];
      if (typeof rate !== 'number' || rate <= 0) {
        throw new ApiError('The rate for ' + code + ' is missing.', 'data');
      }
      rates[code] = rate;
    });

    const result = {
      rates: rates,
      updatedAt: data.time_last_update_unix * 1000,
      fetchedAt: Date.now()
    };
    this.store.set(result);
    return result;
  }
}

// Used by the rates LocalStore: { rates: {...numbers}, updatedAt, fetchedAt }
function isValidRates(value) {
  return isPlainObject(value) &&
    isPlainObject(value.rates) &&
    value.rates.USD === 1 &&
    typeof value.fetchedAt === 'number' &&
    typeof value.updatedAt === 'number' &&
    Object.values(value.rates).every(function (rate) {
      return typeof rate === 'number' && rate > 0;
    });
}
