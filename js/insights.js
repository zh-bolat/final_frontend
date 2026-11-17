/*
  Forma — cart insights on the Cart page
  Statistics tiles and a horizontal bar chart made from div elements.
  All numbers come from methods of the Cart object (js/models.js).
*/

const insightStats = document.getElementById('insight-stats');
const roomChart = document.getElementById('room-chart');
const chartEmpty = document.getElementById('chart-empty');

// "62%"
function formatShare(part, whole) {
  return whole === 0 ? '0%' : Math.round((part / whole) * 100) + '%';
}

// One statistics tile: a big value and a small label under it
function createStatTile(value, label) {
  const tile = document.createElement('li');
  tile.className = 'insight-stat';
  tile.innerHTML = '<span class="insight-value"></span><span class="insight-label"></span>';
  tile.querySelector('.insight-value').textContent = value;
  tile.querySelector('.insight-label').textContent = label;
  return tile;
}

// The line with the highest total, e.g. 2 × Nord sofa
function getBiggestLine(lines) {
  return lines.reduce(function (biggest, line) {
    return biggest === null || line.total > biggest.total ? line : biggest;
  }, null);
}

function renderStats() {
  const lines = cart.getLines();
  const count = cart.getCount();
  const subtotal = cart.getSubtotal();
  const biggest = getBiggestLine(lines);

  insightStats.innerHTML = '';
  insightStats.append(
    createStatTile(String(count), count === 1 ? 'piece in the cart' : 'pieces in the cart'),
    createStatTile(count === 0 ? '—' : formatPrice(Math.round(subtotal / count)), 'average price per piece'),
    createStatTile(biggest ? biggest.product.name : '—', biggest ? formatShare(biggest.total, subtotal) + ' of the total' : 'largest part of the total'),
    createStatTile(String(lines.length), lines.length === 1 ? 'different model' : 'different models')
  );
}

// One bar per room. The longest bar is the room with the biggest total,
// the others are drawn relative to it.
function renderRoomChart() {
  const totals = cart.getTotalsByRoom();
  const subtotal = cart.getSubtotal();
  const roomList = rooms.filter(function (room) {
    return room.value !== 'all';
  });
  const maxTotal = Math.max.apply(null, roomList.map(function (room) {
    return totals[room.value] || 0;
  }));

  roomChart.innerHTML = '';
  roomChart.hidden = cart.isEmpty();
  chartEmpty.hidden = !cart.isEmpty();
  if (cart.isEmpty()) {
    return;
  }

  roomList.forEach(function (room) {
    const total = totals[room.value] || 0;
    const row = document.createElement('li');
    row.className = 'bar-row' + (total === 0 ? ' is-zero' : '');
    row.innerHTML = `
      <span class="bar-label">${room.label}</span>
      <span class="bar-track"><span class="bar-fill"></span></span>
      <span class="bar-value"><span data-price="${total}">${formatPrice(total)}</span> · ${formatShare(total, subtotal)}</span>`;
    roomChart.appendChild(row);

    // Width is set one frame later, so the CSS transition animates the bar
    const fill = row.querySelector('.bar-fill');
    requestAnimationFrame(function () {
      fill.style.width = (maxTotal === 0 ? 0 : (total / maxTotal) * 100) + '%';
    });
  });
}

function renderInsights() {
  renderStats();
  renderRoomChart();
}

document.addEventListener('DOMContentLoaded', function () {
  renderInsights();
  document.addEventListener('cart:change', renderInsights);
  document.addEventListener('currency:change', renderStats); // the chart prices use data-price
});
