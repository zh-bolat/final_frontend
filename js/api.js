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

/* ===== Weather: WeatherService and ForecastDay =====
   Open-Meteo returns the forecast as parallel arrays:
   daily.time[i], daily.weather_code[i], daily.temperature_2m_max[i] ...
   WeatherService turns position i of every array into one ForecastDay object. */

// WMO weather codes used by Open-Meteo → text and icon
const weatherCodes = [
  { codes: [0], label: 'Clear sky', icon: '☀️' },
  { codes: [1, 2], label: 'Partly cloudy', icon: '⛅' },
  { codes: [3], label: 'Cloudy', icon: '☁️' },
  { codes: [45, 48], label: 'Fog', icon: '🌫️' },
  { codes: [51, 53, 55, 56, 57], label: 'Drizzle', icon: '🌦️' },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], label: 'Rain', icon: '🌧️' },
  { codes: [71, 73, 75, 77, 85, 86], label: 'Snow', icon: '❄️' },
  { codes: [95, 96, 99], label: 'Thunderstorm', icon: '⛈️' }
];

class ForecastDay {
  constructor(date, code, maxTemp, minTemp, rainChance) {
    this.date = date; // "2026-11-18"
    this.code = code;
    this.maxTemp = Math.round(maxTemp);
    this.minTemp = Math.round(minTemp);
    this.rainChance = rainChance === null || rainChance === undefined ? 0 : rainChance;
  }

  getWeather() {
    const code = this.code;
    const match = weatherCodes.find(function (item) {
      return item.codes.includes(code);
    });
    return match || { label: 'Mixed weather', icon: '🌤️' };
  }

  isToday() {
    return this.date === toInputDate(getToday());
  }

  // "Today" or "Wed"
  getDayName() {
    if (this.isToday()) {
      return 'Today';
    }
    return new Date(this.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
  }

  // "18 Nov"
  getShortDate() {
    return new Date(this.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  // A dry day without storms is a nice day to cross the city
  isGoodForVisit() {
    return this.rainChance <= 30 && this.code < 61;
  }

  // "Wednesday 18 November: Cloudy, 4° / −3°, 10% chance of rain"
  getDescription() {
    return formatLongDate(this.date) + ': ' + this.getWeather().label + ', ' +
      this.maxTemp + '° / ' + this.minTemp + '°, ' + this.rainChance + '% chance of rain';
  }
}

class WeatherService extends ApiService {
  constructor(latitude, longitude) {
    super('https://api.open-meteo.com/v1/', 8000);
    this.latitude = latitude;
    this.longitude = longitude;
  }

  // Returns an array of ForecastDay objects (may be empty)
  async getForecast(days) {
    const data = await this.getJson('forecast', {
      latitude: this.latitude,
      longitude: this.longitude,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: days
    });

    const daily = data && data.daily;
    if (!daily || !Array.isArray(daily.time)) {
      throw new ApiError('The forecast came back in an unexpected format.', 'data');
    }

    return daily.time
      .map(function (date, i) {
        return new ForecastDay(
          date,
          daily.weather_code[i],
          daily.temperature_2m_max[i],
          daily.temperature_2m_min[i],
          daily.precipitation_probability_max[i]
        );
      })
      // A day without temperatures is useless, so it is skipped
      .filter(function (day) {
        return Number.isFinite(day.maxTemp) && Number.isFinite(day.minTemp);
      });
  }
}
