/*
  Forma — visit forecast on the Contact page
  Loads 7 days of weather for the showroom from Open-Meteo (WeatherService in js/api.js)
  and shows one of four states: loading, success, empty or error.
*/

// The showroom in Astana
const weatherService = new WeatherService(51.1694, 71.4491);
const FORECAST_DAYS = 7;

const forecastDays = document.getElementById('forecast-days');
const forecastStatus = document.getElementById('forecast-status');

/* ===== State 1: loading — grey placeholder tiles ===== */
function renderForecastLoading() {
  forecastDays.setAttribute('aria-busy', 'true');
  forecastDays.innerHTML = '';
  for (let i = 0; i < FORECAST_DAYS; i++) {
    const placeholder = document.createElement('div');
    placeholder.className = 'forecast-day is-loading';
    placeholder.setAttribute('aria-hidden', 'true');
    forecastDays.appendChild(placeholder);
  }
  forecastStatus.textContent = 'Loading the forecast…';
}

/* ===== States 3 and 4: empty and error — a message instead of the tiles ===== */
function renderForecastMessage(title, text, withRetry) {
  forecastDays.removeAttribute('aria-busy');
  forecastDays.innerHTML = '';

  const box = document.createElement('div');
  box.className = 'forecast-message' + (withRetry ? ' is-error' : '');
  box.innerHTML = '<p class="forecast-message-title"></p><p class="forecast-message-text"></p>';
  box.querySelector('.forecast-message-title').textContent = title;
  box.querySelector('.forecast-message-text').textContent = text;

  if (withRetry) {
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'btn btn-soft btn-small';
    retry.id = 'forecast-retry';
    retry.textContent = 'Try again';
    box.appendChild(retry);
  }

  forecastDays.appendChild(box);
  forecastStatus.textContent = '';
}

/* ===== State 2: success — one button per day ===== */
function createForecastButton(day) {
  const weather = day.getWeather();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'forecast-day';
  button.dataset.date = day.date;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Choose ' + day.getDescription());

  button.innerHTML = `
    <span class="forecast-name">${day.getDayName()}</span>
    <span class="forecast-date">${day.getShortDate()}</span>
    <span class="forecast-icon" aria-hidden="true">${weather.icon}</span>
    <span class="forecast-label">${weather.label}</span>
    <span class="forecast-temp"><strong>${day.maxTemp}°</strong> ${day.minTemp}°</span>
    <span class="forecast-rain">${day.rainChance}% rain</span>`;

  if (day.isGoodForVisit()) {
    button.classList.add('is-good');
    const badge = document.createElement('span');
    badge.className = 'forecast-badge';
    badge.textContent = 'Good day';
    button.appendChild(badge);
  }
  return button;
}

function renderForecast(days) {
  forecastDays.removeAttribute('aria-busy');
  forecastDays.innerHTML = '';
  days.forEach(function (day) {
    forecastDays.appendChild(createForecastButton(day));
  });

  const time = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  forecastStatus.textContent = 'Updated at ' + time + ' · data by Open-Meteo';
}

// async / await: the page keeps working while the forecast loads
async function loadForecast() {
  renderForecastLoading();
  try {
    const days = await weatherService.getForecast(FORECAST_DAYS);
    if (days.length === 0) {
      renderForecastMessage('No forecast right now.', 'The weather service has no data for the coming days. Any day from 10:00 to 20:00 is fine for a visit.', false);
      return;
    }
    renderForecast(days);
  } catch (error) {
    // ApiError has a readable message; anything else gets a general one
    const text = error instanceof ApiError ? error.message : 'Something went wrong.';
    renderForecastMessage('Could not load the forecast.', text + ' You can still pick any date in the form.', true);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  loadForecast();

  // The retry button is created later, so the click is delegated
  forecastDays.addEventListener('click', function (event) {
    if (event.target.id === 'forecast-retry') {
      loadForecast();
    }
  });
});
