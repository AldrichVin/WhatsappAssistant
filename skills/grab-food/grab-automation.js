/**
 * GrabFood Browser Automation
 *
 * This module provides browser automation for GrabFood ordering.
 * WARNING: Browser automation may violate GrabFood's ToS. Use at your own risk.
 */

const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const GRABFOOD_URL = 'https://food.grab.com/id/id/';
const COOKIES_PATH = path.join(__dirname, 'cookies.json');
const SELECTORS_PATH = path.join(__dirname, 'selectors.json');

// Default selectors (update when UI changes)
const DEFAULT_SELECTORS = {
  // Search
  searchInput: 'input[placeholder*="Search"]',
  searchButton: 'button[type="submit"]',

  // Restaurant list
  restaurantCard: '[data-testid="restaurant-card"]',
  restaurantName: '.restaurant-name',
  restaurantRating: '.rating',
  restaurantDistance: '.distance',
  restaurantDeliveryTime: '.delivery-time',

  // Menu
  menuCategory: '.menu-category',
  menuItem: '.menu-item',
  itemName: '.item-name',
  itemPrice: '.item-price',
  itemDescription: '.item-description',
  addButton: 'button[data-testid="add-to-cart"]',

  // Cart
  cartIcon: '[data-testid="cart-icon"]',
  cartItem: '.cart-item',
  cartTotal: '.cart-total',
  checkoutButton: '[data-testid="checkout"]',

  // Checkout
  orderSummary: '.order-summary',
  deliveryFee: '.delivery-fee',
  totalPrice: '.total-price',
  confirmButton: '[data-testid="confirm-order"]',

  // Order tracking
  orderStatus: '.order-status',
  driverInfo: '.driver-info'
};

let browser = null;
let page = null;
let selectors = DEFAULT_SELECTORS;

/**
 * Initialize browser and load selectors
 */
async function initialize() {
  // Load custom selectors if available
  try {
    const customSelectors = JSON.parse(await fs.readFile(SELECTORS_PATH, 'utf8'));
    selectors = { ...DEFAULT_SELECTORS, ...customSelectors };
  } catch (err) {
    // Use defaults
  }

  // Launch browser
  browser = await puppeteer.launch({
    headless: false,
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ]
  });

  page = await browser.newPage();

  // Set viewport
  await page.setViewport({ width: 1280, height: 800 });

  // Load cookies if available
  try {
    const cookies = JSON.parse(await fs.readFile(COOKIES_PATH, 'utf8'));
    await page.setCookie(...cookies);
  } catch (err) {
    // No saved cookies
  }

  // Navigate to GrabFood
  await page.goto(GRABFOOD_URL, { waitUntil: 'networkidle2' });

  return { success: true };
}

/**
 * Save current session cookies
 */
async function saveCookies() {
  const cookies = await page.cookies();
  await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
}

/**
 * Check if user is logged in
 * @returns {Promise<boolean>}
 */
async function isLoggedIn() {
  // Check for login-specific elements
  const loginButton = await page.$('[data-testid="login-button"]');
  return !loginButton;
}

/**
 * Search for restaurants
 * @param {string} query - Search query
 * @param {number} maxResults - Maximum results to return
 * @returns {Promise<Array>} Restaurant list
 */
async function searchRestaurants(query, maxResults = 5) {
  if (!page) await initialize();

  // Navigate to search
  await page.goto(`${GRABFOOD_URL}search?q=${encodeURIComponent(query)}`, {
    waitUntil: 'networkidle2'
  });

  // Wait for results
  await page.waitForSelector(selectors.restaurantCard, { timeout: 10000 });

  // Extract restaurant data
  const restaurants = await page.evaluate((sel, max) => {
    const cards = document.querySelectorAll(sel.restaurantCard);
    const results = [];

    for (let i = 0; i < Math.min(cards.length, max); i++) {
      const card = cards[i];
      results.push({
        id: card.getAttribute('data-restaurant-id') || `restaurant-${i}`,
        name: card.querySelector(sel.restaurantName)?.textContent?.trim() || 'Unknown',
        rating: card.querySelector(sel.restaurantRating)?.textContent?.trim() || 'N/A',
        distance: card.querySelector(sel.restaurantDistance)?.textContent?.trim() || 'N/A',
        deliveryTime: card.querySelector(sel.restaurantDeliveryTime)?.textContent?.trim() || 'N/A',
        href: card.querySelector('a')?.href || ''
      });
    }

    return results;
  }, selectors, maxResults);

  return restaurants;
}

/**
 * Get menu from a restaurant
 * @param {string} restaurantId - Restaurant ID or URL
 * @returns {Promise<Object>} Menu data
 */
async function getMenu(restaurantId) {
  if (!page) await initialize();

  // Navigate to restaurant page
  const url = restaurantId.startsWith('http')
    ? restaurantId
    : `${GRABFOOD_URL}restaurant/${restaurantId}`;

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for menu to load
  await page.waitForSelector(selectors.menuItem, { timeout: 10000 });

  // Extract menu data
  const menu = await page.evaluate((sel) => {
    const categories = document.querySelectorAll(sel.menuCategory);
    const result = {
      restaurantName: document.querySelector('.restaurant-name')?.textContent?.trim() || '',
      categories: []
    };

    categories.forEach(cat => {
      const categoryName = cat.querySelector('.category-name')?.textContent?.trim() || 'Other';
      const items = cat.querySelectorAll(sel.menuItem);
      const categoryItems = [];

      items.forEach((item, idx) => {
        categoryItems.push({
          id: item.getAttribute('data-item-id') || `item-${idx}`,
          name: item.querySelector(sel.itemName)?.textContent?.trim() || '',
          price: item.querySelector(sel.itemPrice)?.textContent?.trim() || '',
          description: item.querySelector(sel.itemDescription)?.textContent?.trim() || ''
        });
      });

      if (categoryItems.length > 0) {
        result.categories.push({
          name: categoryName,
          items: categoryItems
        });
      }
    });

    return result;
  }, selectors);

  return menu;
}

/**
 * Add item to cart
 * @param {string} itemId - Menu item ID
 * @param {number} quantity - Quantity
 * @param {string} notes - Special instructions
 * @returns {Promise<Object>} Cart update result
 */
async function addToCart(itemId, quantity = 1, notes = '') {
  if (!page) await initialize();

  // Find and click the add button for the item
  const itemSelector = `[data-item-id="${itemId}"]`;

  for (let i = 0; i < quantity; i++) {
    await page.click(`${itemSelector} ${selectors.addButton}`);
    await delay(500);
  }

  // Handle notes if provided
  if (notes) {
    // Look for notes input field
    const notesInput = await page.$(`${itemSelector} input[placeholder*="instructions"]`);
    if (notesInput) {
      await notesInput.type(notes);
    }
  }

  // Get updated cart total
  const cartTotal = await page.evaluate((sel) => {
    return document.querySelector(sel.cartTotal)?.textContent?.trim() || '0';
  }, selectors);

  return {
    success: true,
    itemId,
    quantity,
    notes,
    cartTotal
  };
}

/**
 * View current cart
 * @returns {Promise<Object>} Cart contents
 */
async function viewCart() {
  if (!page) await initialize();

  // Click cart icon to open
  await page.click(selectors.cartIcon);
  await delay(1000);

  // Extract cart data
  const cart = await page.evaluate((sel) => {
    const items = document.querySelectorAll(sel.cartItem);
    const cartItems = [];

    items.forEach(item => {
      cartItems.push({
        name: item.querySelector('.item-name')?.textContent?.trim() || '',
        quantity: item.querySelector('.quantity')?.textContent?.trim() || '1',
        price: item.querySelector('.price')?.textContent?.trim() || ''
      });
    });

    return {
      items: cartItems,
      subtotal: document.querySelector('.subtotal')?.textContent?.trim() || '0',
      deliveryFee: document.querySelector(sel.deliveryFee)?.textContent?.trim() || '0',
      total: document.querySelector(sel.totalPrice)?.textContent?.trim() || '0'
    };
  }, selectors);

  return cart;
}

/**
 * Remove item from cart
 * @param {string} itemId - Item ID to remove
 * @returns {Promise<Object>} Updated cart
 */
async function removeFromCart(itemId) {
  if (!page) await initialize();

  // Click remove button
  await page.click(`[data-cart-item-id="${itemId}"] .remove-button`);
  await delay(500);

  return await viewCart();
}

/**
 * Proceed to checkout (review only, no payment)
 * @returns {Promise<Object>} Order summary
 */
async function checkout() {
  if (!page) await initialize();

  // Click checkout button
  await page.click(selectors.checkoutButton);
  await delay(2000);

  // Wait for checkout page
  await page.waitForSelector(selectors.orderSummary, { timeout: 10000 });

  // Extract order summary
  const summary = await page.evaluate((sel) => {
    const items = document.querySelectorAll('.order-item');
    const orderItems = [];

    items.forEach(item => {
      orderItems.push({
        name: item.querySelector('.item-name')?.textContent?.trim() || '',
        quantity: item.querySelector('.quantity')?.textContent?.trim() || '1',
        price: item.querySelector('.price')?.textContent?.trim() || ''
      });
    });

    return {
      restaurant: document.querySelector('.restaurant-name')?.textContent?.trim() || '',
      items: orderItems,
      subtotal: document.querySelector('.subtotal')?.textContent?.trim() || '',
      deliveryFee: document.querySelector(sel.deliveryFee)?.textContent?.trim() || '',
      total: document.querySelector(sel.totalPrice)?.textContent?.trim() || '',
      estimatedTime: document.querySelector('.estimated-time')?.textContent?.trim() || '',
      deliveryAddress: document.querySelector('.delivery-address')?.textContent?.trim() || '',
      paymentMethod: document.querySelector('.payment-method')?.textContent?.trim() || ''
    };
  }, selectors);

  return summary;
}

/**
 * Confirm and place the order
 * @returns {Promise<Object>} Order confirmation
 */
async function confirmOrder() {
  if (!page) await initialize();

  // Click confirm button
  await page.click(selectors.confirmButton);

  // Wait for confirmation
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  // Extract order ID
  const confirmation = await page.evaluate(() => {
    return {
      orderId: document.querySelector('.order-id')?.textContent?.trim() || '',
      estimatedArrival: document.querySelector('.estimated-arrival')?.textContent?.trim() || '',
      status: 'confirmed'
    };
  });

  // Save cookies (to maintain session)
  await saveCookies();

  return confirmation;
}

/**
 * Track order status
 * @param {string} orderId - Order ID (optional, uses latest)
 * @returns {Promise<Object>} Order tracking info
 */
async function trackOrder(orderId = null) {
  if (!page) await initialize();

  // Navigate to order tracking
  const url = orderId
    ? `${GRABFOOD_URL}order/${orderId}`
    : `${GRABFOOD_URL}orders`;

  await page.goto(url, { waitUntil: 'networkidle2' });

  // Extract tracking info
  const tracking = await page.evaluate((sel) => {
    return {
      orderId: document.querySelector('.order-id')?.textContent?.trim() || '',
      status: document.querySelector(sel.orderStatus)?.textContent?.trim() || '',
      driver: {
        name: document.querySelector('.driver-name')?.textContent?.trim() || '',
        phone: document.querySelector('.driver-phone')?.textContent?.trim() || '',
        vehicle: document.querySelector('.driver-vehicle')?.textContent?.trim() || ''
      },
      estimatedArrival: document.querySelector('.eta')?.textContent?.trim() || '',
      timeline: Array.from(document.querySelectorAll('.status-timeline li')).map(li => ({
        status: li.querySelector('.status')?.textContent?.trim() || '',
        time: li.querySelector('.time')?.textContent?.trim() || '',
        completed: li.classList.contains('completed')
      }))
    };
  }, selectors);

  return tracking;
}

/**
 * Cancel current order/cart
 * @returns {Promise<boolean>}
 */
async function cancelOrder() {
  if (!page) await initialize();

  // Look for cancel button
  const cancelButton = await page.$('[data-testid="cancel-order"]');

  if (cancelButton) {
    await cancelButton.click();
    await delay(1000);

    // Confirm cancellation
    const confirmCancel = await page.$('[data-testid="confirm-cancel"]');
    if (confirmCancel) {
      await confirmCancel.click();
    }

    return true;
  }

  return false;
}

/**
 * Close browser
 */
async function close() {
  if (browser) {
    await saveCookies();
    await browser.close();
    browser = null;
    page = null;
  }
}

/**
 * Helper function for delays
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  initialize,
  isLoggedIn,
  searchRestaurants,
  getMenu,
  addToCart,
  viewCart,
  removeFromCart,
  checkout,
  confirmOrder,
  trackOrder,
  cancelOrder,
  close
};
