/*
  Forma — Product class
  Every item of productData (js/data.js) becomes a Product object.
  The object keeps the same fields as before (id, name, price...), so the
  rest of the code can still read product.name, and it adds methods that
  answer questions about one product.
*/
class Product {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.category = data.category;
    this.room = data.room;
    this.material = data.material;
    this.size = data.size;
    this.deliveryDays = data.deliveryDays;
    this.price = data.price;
    this.tag = data.tag || '';
    this.featured = Boolean(data.featured);
    this.image = data.image;
    this.alt = data.alt;
    this.description = data.description;
  }

  // true when the name, category or material contains the text (case does not matter)
  matches(text) {
    const query = text.trim().toLowerCase();
    if (query === '') {
      return true;
    }
    const haystack = (this.name + ' ' + this.category + ' ' + this.material).toLowerCase();
    return haystack.includes(query);
  }

  // "all" means every room
  isInRoom(roomValue) {
    return roomValue === 'all' || this.room === roomValue;
  }

  getDeliveryText() {
    return this.deliveryDays + (this.deliveryDays === 1 ? ' day' : ' days');
  }

  getRoomLabel() {
    return getRoomLabel(this.room);
  }

  // Price of several pieces in US dollars
  getTotal(quantity) {
    return this.price * quantity;
  }
}

// The products array the whole site uses: six Product objects
const products = productData.map(function (data) {
  return new Product(data);
});

/*
  Cart class — the shopping cart.
  Items are saved as [{ id: 'nord-sofa', quantity: 2 }, ...] through a LocalStore,
  so the cart survives a reload and is shared by every page.
  Each change is saved at once and announced with the "cart:change" event.
*/
class Cart {
  constructor(store, maxQuantity) {
    this.store = store;
    this.maxQuantity = maxQuantity;
    this.items = this.load();
  }

  // Reads the saved items and keeps only the valid ones
  load() {
    const maxQuantity = this.maxQuantity;
    return this.store.get()
      .filter(function (item) {
        return isPlainObject(item) &&
          Cart.findProduct(item.id) !== undefined &&
          Number.isInteger(item.quantity) &&
          item.quantity > 0;
      })
      .map(function (item) {
        return { id: item.id, quantity: Math.min(item.quantity, maxQuantity) };
      });
  }

  save() {
    this.store.set(this.items);
    document.dispatchEvent(new CustomEvent('cart:change'));
  }

  // Reloads the items, e.g. after another browser tab changed the cart
  reload() {
    this.items = this.load();
    document.dispatchEvent(new CustomEvent('cart:change'));
  }

  findItem(productId) {
    return this.items.find(function (item) {
      return item.id === productId;
    });
  }

  getQuantity(productId) {
    const item = this.findItem(productId);
    return item ? item.quantity : 0;
  }

  // Create: adds a product or raises its quantity. Returns the new quantity.
  add(productId, quantity) {
    const amount = quantity || 1;
    const item = this.findItem(productId);
    if (item) {
      item.quantity = Math.min(item.quantity + amount, this.maxQuantity);
    } else {
      this.items.push({ id: productId, quantity: Math.min(amount, this.maxQuantity) });
    }
    this.save();
    return this.getQuantity(productId);
  }

  // Update: sets an exact quantity; 0 or less removes the product
  setQuantity(productId, quantity) {
    const item = this.findItem(productId);
    if (!item) {
      return;
    }
    if (quantity < 1) {
      this.remove(productId);
      return;
    }
    item.quantity = Math.min(quantity, this.maxQuantity);
    this.save();
  }

  // Delete: removes one product
  remove(productId) {
    this.items = this.items.filter(function (item) {
      return item.id !== productId;
    });
    this.save();
  }

  // Delete: removes everything
  clear() {
    this.items = [];
    this.save();
  }

  /* ===== Read: values computed from the items ===== */

  isEmpty() {
    return this.items.length === 0;
  }

  // Number of pieces, e.g. 2 sofas + 4 chairs = 6
  getCount() {
    return this.items.reduce(function (sum, item) {
      return sum + item.quantity;
    }, 0);
  }

  // One line per product with the Product object and the line total
  getLines() {
    return this.items.map(function (item) {
      const product = Cart.findProduct(item.id);
      return { product: product, quantity: item.quantity, total: product.getTotal(item.quantity) };
    });
  }

  getSubtotal() {
    return this.getLines().reduce(function (sum, line) {
      return sum + line.total;
    }, 0);
  }

  // The order arrives when the slowest piece is ready
  getLongestDelivery() {
    return this.getLines().reduce(function (longest, line) {
      return Math.max(longest, line.product.deliveryDays);
    }, 0);
  }

  // { living: 2130, dining: 380 } — used by the cart insights chart
  getTotalsByRoom() {
    const totals = {};
    this.getLines().forEach(function (line) {
      const room = line.product.room;
      totals[room] = (totals[room] || 0) + line.total;
    });
    return totals;
  }

  static findProduct(productId) {
    return products.find(function (product) {
      return product.id === productId;
    });
  }
}

// One cart for the whole site; at most 10 pieces of one model per order
const cart = new Cart(new LocalStore('forma-cart', [], Array.isArray), 10);
