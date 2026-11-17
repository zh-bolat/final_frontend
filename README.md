# Forma — Furniture Store Website

Final project for the Frontend course. It continues our midterm and endterm website for
**Forma**, a fictional minimalist furniture store with a showroom in Astana.

- **Midterm:** five responsive pages with HTML, CSS and Bootstrap.
- **Endterm:** the same pages made interactive with JavaScript and jQuery (search, filters,
  favorites, theme switcher, gallery lightbox, form validation).
- **Final:** the site became a small client-side shop. It loads live data from two public APIs,
  is organised around JavaScript classes, and keeps the cart, settings and a checkout draft in
  `localStorage`. There is a new **Cart** page with a three-step checkout and a statistics panel.

Every feature from the midterm and endterm still works. Nothing was replaced, only extended.

**Live site:** [https://zh-bolat.github.io/final_frontend/](https://zh-bolat.github.io/final_frontend/)  
**Repository:** [github.com/zh-bolat/final_frontend](https://github.com/zh-bolat/final_frontend)  
**Endterm version:** [github.com/zh-bolat/endterm_frontend](https://github.com/zh-bolat/endterm_frontend)

## Team

| Student | Midterm | Endterm | Final |
|---|---|---|---|
| ParasatAshk | Project foundation (shared CSS, navbar, footer), Home, About | Shared data and helpers, theme switcher, favorites counter and panel, back-to-top, Home featured products, About FAQ | `LocalStore`, `Product`, `Cart` classes; `ApiService` and `CurrencyService`; currency switcher; cart link and "Add to cart" buttons; Cart page (list, quantities, remove, clear, summary); tab sync; README |
| bolatov | Catalog, Gallery, Contact | Catalog search, filter, sort, favorites hearts and details, Gallery tabs and lightbox, Contact form validation | `FormValidator` class; `WeatherService` and `ForecastDay`; visit forecast on Contact; cart insights chart; three-step checkout with dependent fields, calculated totals, saved draft and order confirmation |

The commit history shows who wrote which part.

## Technologies

- HTML5, CSS3 (custom properties, Flexbox, CSS Grid, media queries)
- [Bootstrap 5.3.3](https://getbootstrap.com/) from the jsDelivr CDN
- **JavaScript (ES6+)**: classes and inheritance, `async` / `await`, `fetch`, Promises,
  array methods, DOM manipulation, events, `localStorage` with JSON
- **[jQuery 3.7.1](https://jquery.com/)**: selectors, traversal, events, effects
- Google Fonts: Inter and Instrument Serif
- Photos from [Unsplash](https://unsplash.com/)

## APIs

Both APIs are free, public and need **no API key**, so there is nothing secret in the code.

| API | Used for | Request |
|---|---|---|
| [Open-Meteo](https://open-meteo.com/) | 7-day weather forecast for the showroom on the Contact page | `https://api.open-meteo.com/v1/forecast?latitude=51.1694&longitude=71.4491&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7` |
| [ExchangeRate-API (open access)](https://www.exchangerate-api.com/docs/free) | Live USD → EUR and KZT rates for the currency switcher | `https://open.er-api.com/v6/latest/USD` |

Both requests go through the `ApiService` class in `js/api.js`. It uses `fetch` with
`async` / `await`, stops a request after 8 seconds (`AbortController`) and turns every failure
(no internet, timeout, HTTP error, broken JSON) into an `ApiError` with a message we can show.

## How to run

1. Download or clone the repository.
2. Open `index.html` in any modern browser, or run a small local server, e.g.
   `python3 -m http.server` in the project folder and open `http://localhost:8000`.

You need an internet connection for Bootstrap, jQuery, the fonts and the two APIs.
There is no build step: the scripts are plain `.js` files, not modules,
so the site also works when it is opened straight from disk (`file://`).

## Folder structure

```
├── index.html          Home
├── about.html          About
├── catalog.html        Catalog
├── gallery.html        Gallery
├── contact.html        Contact + visit forecast
├── cart.html           Cart, cart insights, checkout            (final)
├── css/
│   └── style.css       shared styles (endterm and final components, dark theme)
├── js/
│   ├── theme.js        applies the saved light/dark theme (loaded in <head>)
│   ├── data.js         arrays: productData, rooms, galleryPhotos
│   ├── store.js        class LocalStore: safe JSON in localStorage           (final)
│   ├── models.js       class Product, class Cart, the products array          (final)
│   ├── api.js          ApiError, ApiService, CurrencyService,
│   │                   WeatherService, ForecastDay                            (final)
│   ├── utils.js        helpers: favorites, toast, product card
│   ├── currency.js     currency switcher and formatPrice()                    (final)
│   ├── main.js         every page: theme, favorites, cart badge and buttons, back-to-top
│   ├── effects.js      jQuery: panel fades, product details, smooth scroll, FAQ
│   ├── validation.js   check functions and class FormValidator                (final)
│   ├── home.js         Home: featured products
│   ├── catalog.js      Catalog: grid, table, search, filter, sort
│   ├── gallery.js      Gallery: photo grid, tabs, lightbox
│   ├── contact.js      Contact: booking form rules
│   ├── forecast.js     Contact: weather forecast, date picking                (final)
│   ├── cart-page.js    Cart: item list, quantities, remove, clear, summary    (final)
│   ├── insights.js     Cart: statistics tiles and bar chart                   (final)
│   └── checkout.js     Cart: three-step checkout                              (final)
├── images/
└── README.md
```

Scripts load at the end of `<body>` in this order: jQuery → Bootstrap → `data.js` →
`store.js` → `models.js` → `api.js` → `utils.js` → `currency.js` → `main.js` → `effects.js` →
the page's own files. Each file can use what the files above it define.

Data, logic and interface are kept apart: `data.js` only holds data, the classes in
`store.js`, `models.js` and `api.js` hold the logic and know nothing about the page, and the page
files (`cart-page.js`, `checkout.js`, `forecast.js`…) draw the interface and handle events.

## Final-stage features

### 1. Object-oriented JavaScript (mandatory)

| Class | File | What it does | Objects made from it |
|---|---|---|---|
| `LocalStore` | `store.js` | One localStorage key: `get()` parses and validates JSON, `set()`, `clear()` | favorites, cart, theme, currency, rates, checkout draft (6 objects) |
| `Product` | `models.js` | One product with methods `matches()`, `isInRoom()`, `getDeliveryText()`, `getRoomLabel()`, `getTotal()` | 6 products made with `productData.map()` |
| `Cart` | `models.js` | The cart: `add()`, `setQuantity()`, `remove()`, `clear()`, `getLines()`, `getSubtotal()`, `getLongestDelivery()`, `getTotalsByRoom()` | `cart`, shared by all pages |
| `ApiService` | `api.js` | Base class: builds the URL, `fetch` with a timeout, readable errors | parent of the two classes below |
| `CurrencyService extends ApiService` | `api.js` | Gets exchange rates and caches them for 12 hours | `currencyService` |
| `WeatherService extends ApiService` | `api.js` | Gets the forecast and turns it into `ForecastDay` objects | `weatherService` |
| `ForecastDay` | `api.js` | One day of weather: `getWeather()`, `getDayName()`, `isGoodForVisit()`, `getDescription()` | 7 objects per forecast |
| `ApiError extends Error` | `api.js` | An error with a `kind` (network, timeout, http, data) | created on every failure |
| `FormValidator` | `validation.js` | Connects check functions to a form: `validateField()`, `validateAll()`, `watch()`, `clear()` | `bookingValidator` (Contact), `checkoutValidator` (Cart) |

The old code now uses these classes too: the Catalog filter calls `product.matches()` and
`product.isInRoom()`, the favorites use a `LocalStore`, and the booking form uses `FormValidator`
instead of its own copy of the validation code.

### 2. API integration (mandatory)

- **Visit forecast (Contact).** Seven day tiles from Open-Meteo with an icon, temperatures and
  the chance of rain. Dry days get a "Good day" badge. **Clicking a day puts its date into the
  booking form** and checks it with the same rules as a typed date.
  - *Loading:* seven pulsing placeholder tiles and "Loading the forecast…"
  - *Success:* the tiles and "Updated at 23:05 · data by Open-Meteo"
  - *Empty:* a message that no forecast is available, any day is still fine
  - *Error:* the reason (e.g. "No connection to the server") and a **Try again** button
- **Currency switcher (every page).** The select in the navbar shows all prices in
  **USD, EUR or KZT** with live rates: product cards, the comparison table, the favorites panel,
  the hero chip, the cart and the checkout. Prices carry a `data-price` attribute in dollars,
  so `refreshPrices()` can rewrite them all at once.
  - *Loading / success / error* are shown in a note under the catalog and in the cart summary
    ("1 USD = 444.74 KZT, rates from 17 Nov"). Without rates the site falls back to dollars and
    offers **Try again**; old saved rates are used if a refresh fails.

### 3. localStorage (mandatory)

| Key | Content | Restored | Updated / cleared |
|---|---|---|---|
| `forma-cart` | `[{"id":"nord-sofa","quantity":2}]` | on every page (badge, buttons, cart page) | quantity controls, remove, **Clear cart**, placing an order |
| `forma-checkout-draft` | `{"step":2,"values":{...}}` | the checkout opens on the saved step with the saved values | every keystroke, **Clear the form**, placing an order |
| `forma-currency` | `"KZT"` | prices are shown in this currency | the navbar select |
| `forma-rates` | `{"rates":{"USD":1,"EUR":0.91,"KZT":444.7},"updatedAt":…,"fetchedAt":…}` | used at once, refreshed after 12 hours | by `CurrencyService` |
| `forma-favorites` | `["nord-sofa"]` | navbar panel, hearts, booking form (endterm) | hearts, *Remove* |
| `forma-theme` | `"dark"` | before the page is drawn (endterm) | theme button |

Invalid values are handled safely: `LocalStore.get()` catches broken JSON, checks the value with
a validator function and removes it if it is wrong. The `Cart` also drops unknown product ids and
quantities that are not whole numbers. Open two tabs and the cart and favorites stay in sync
(the `storage` event).

### 4. CRUD — the shopping cart (additional feature)

- **Create:** "Add to cart" on every product card (Home and Catalog). The button then shows
  "✓ In cart · 2" and the navbar badge counts the pieces.
- **Read:** the new Cart page lists every item with photo, details, price per piece and line total,
  plus an order summary (pieces, subtotal, when it is ready, total).
- **Update:** − / + buttons and a number field (1–10, wrong values are rejected with a message).
- **Delete:** × removes one item with a jQuery `slideUp`; *Clear cart* asks for a second click
  instead of a blocking `confirm()` dialog.

### 5. Advanced form — three-step checkout (additional feature)

- **Multi-step:** Contact → Delivery → Review, with a step indicator, *Back* / *Continue* and
  checks before every step. *Place order* checks all steps and jumps to the first one with an error.
- **Dependent fields:** *Pick up at the showroom* hides and disables the address; the
  "cargo lift" question appears only above the first floor; the date label changes between
  *Delivery date* and *Pickup date*.
- **Calculated values:** the earliest date comes from the slowest piece in the cart (express
  delivery halves it); the total adds carrying fees ($5 per floor per piece without a lift) and
  express delivery ($49), or takes 5% off for pickup. The total updates live and in the chosen currency.
- **Custom validation:** name, email, required phone, district, address with a house number,
  floor 1–40, a date between the earliest day and 60 days ahead, payment and confirmation.
- The draft is saved in `localStorage`; on success a confirmation with an order number replaces
  the form and the cart is emptied.

### 6. Statistics panel — cart insights (additional feature)

Under the cart: tiles with the number of pieces, the average price per piece, the biggest item and
its share of the total, and the number of models, plus a **"Spend by room"** bar chart built from
`div` elements whose width is animated with a CSS transition. Everything updates when the cart or the
currency changes.

## Endterm features (kept)

- **Every page:** theme switcher (saved), favorites badge and panel (jQuery fades), back-to-top
  button, toast messages.
- **Home:** featured products from the array, room tiles that open a filtered Catalog.
- **About:** FAQ accordion with jQuery `slideDown` / `slideUp`.
- **Catalog:** product grid and comparison table from the array, live search, room filter,
  sorting, results counter, empty state, hearts, *Details* with `slideToggle`, smooth scrolling.
- **Gallery:** photos from the array, room tabs, lightbox with keyboard control.
- **Contact:** booking form with custom messages, character counter, saved favorites in the form,
  confirmation card.

## Midterm foundation (kept)

- Design tokens as CSS custom properties, pill buttons, headline pills
- Sticky Bootstrap navbar with collapse, shared footer
- CSS Grid (categories, values, gallery, insights), Flexbox (features, stats, info card)
- Semantic HTML, comparison table, positioning, media queries for tablet and phone

## Image credits

All photos are from [Unsplash](https://unsplash.com/) and are used under the
[Unsplash License](https://unsplash.com/license).
