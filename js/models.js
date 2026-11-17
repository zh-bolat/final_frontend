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
