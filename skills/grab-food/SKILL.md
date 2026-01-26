---
name: grab-food
description: Order food from GrabFood via browser automation
version: 1.0.0
metadata:
  clawdbot:
    requires:
      bins: ["node", "chromium"]
    elevated: true
---

# GrabFood Ordering Skill

This skill allows ordering food from GrabFood using browser automation.

## Important Warnings

- This skill uses browser automation which may violate GrabFood's ToS
- UI changes may break automation (requires maintenance)
- Always requires explicit user confirmation before payment
- User must be logged into GrabFood on the browser

## Setup Required

### 1. Install Chromium
```bash
sudo apt install chromium-browser
```

### 2. Configure Browser Path
In Clawdbot config:
```json
{
  "browser": {
    "headless": false,
    "executablePath": "/usr/bin/chromium"
  }
}
```

### 3. GrabFood Login
User must log in to GrabFood manually once on the automated browser.

## Commands

### search_restaurants
Search for restaurants based on query or cuisine.

**Parameters:**
- `query` (required): Search query (e.g., "nasi goreng", "japanese")
- `location` (optional): Delivery address
- `max_results` (optional): Number of results (default: 5)

**Example:**
```
User: "Cariin restoran sushi nearby"
Bot: Calls search_restaurants(query="sushi", max_results=5)
```

### get_menu
Get menu from a specific restaurant.

**Parameters:**
- `restaurant_id` (required): Restaurant ID from search
- `category` (optional): Filter by menu category

**Example:**
```
User: "Lihat menu restoran nomor 2"
Bot: Calls get_menu(restaurant_id="...")
```

### add_to_cart
Add item to cart.

**Parameters:**
- `item_id` (required): Menu item ID
- `quantity` (optional): Quantity (default: 1)
- `notes` (optional): Special instructions

**Example:**
```
User: "Tambahin nasi goreng 2 porsi, tanpa telur"
Bot: Calls add_to_cart(item_id="...", quantity=2, notes="tanpa telur")
```

### view_cart
Show current cart contents and total.

### remove_from_cart
Remove item from cart.

**Parameters:**
- `item_id` (required): Item to remove

### checkout
Review order and request confirmation (does NOT complete payment).

**Returns:**
- Order summary
- Item breakdown
- Delivery fee
- Total price
- Estimated delivery time

**Safety:**
- Shows complete breakdown
- Requires explicit "pesan" or "order" confirmation

### confirm_order
Complete the order after user explicitly confirms.

**Parameters:**
- `payment_method` (optional): Payment method (default: user's default)

**Safety:**
- ONLY call after user says "pesan", "order", "confirm", or similar
- Show final total before confirming
- Provide cancellation option

### cancel_order
Cancel the current order/cart.

### track_order
Track an active order.

**Parameters:**
- `order_id` (optional): Order ID (default: most recent)

## Flow Example

### Complete Ordering Flow
```
User: "Mau pesen makanan"
Bot: "Mau pesen dari mana? Atau mau aku cariin rekomendasi?"

User: "Cariin nasi goreng enak"
Bot: [Calls search_restaurants(query="nasi goreng")]
     "Ini beberapa pilihan:
      1. Warung Pak Eko - Nasi Goreng Spesial
         ⭐ 4.8 | 📍 1.2 km | ⏱️ 25 min | 💰 Rp 18.000-35.000
      2. Nasi Goreng Gila
         ⭐ 4.5 | 📍 2.0 km | ⏱️ 30 min | 💰 Rp 20.000-40.000
      ...
      Mau pilih yang mana?"

User: "Nomor 1"
Bot: [Calls get_menu(restaurant_id="...")]
     "Menu Warung Pak Eko:

      🍚 Nasi Goreng
      1. Nasi Goreng Spesial - Rp 25.000
      2. Nasi Goreng Biasa - Rp 18.000
      3. Nasi Goreng Seafood - Rp 35.000

      🍗 Side Dish
      4. Ayam Goreng - Rp 15.000
      5. Tahu Tempe - Rp 8.000

      Mau pesen apa?"

User: "Nasi goreng spesial 2, sama ayam goreng 1"
Bot: [Calls add_to_cart multiple times]
     "✅ Ditambahkan ke keranjang:
      - 2x Nasi Goreng Spesial @ Rp 25.000
      - 1x Ayam Goreng @ Rp 15.000

      Subtotal: Rp 65.000
      Mau tambah lagi atau checkout?"

User: "Udah, checkout aja"
Bot: [Calls checkout()]
     "📋 Ringkasan Pesanan:

      Warung Pak Eko
      ─────────────────
      2x Nasi Goreng Spesial  Rp 50.000
      1x Ayam Goreng          Rp 15.000
      ─────────────────
      Subtotal                Rp 65.000
      Ongkir                  Rp  8.000
      ─────────────────
      TOTAL                   Rp 73.000

      ⏱️ Estimasi: 25-30 menit
      📍 Kirim ke: [Alamat user]
      💳 Pembayaran: GrabPay

      ⚠️ Konfirmasi untuk memesan.
      Ketik 'pesan' untuk konfirmasi atau 'batal' untuk cancel."

User: "Pesan"
Bot: [Calls confirm_order()]
     "✅ Pesanan berhasil!

      Order ID: GF-123456
      Estimasi tiba: 14:30

      Aku akan kabari kalau ada update.
      Mau track pesanan? Ketik 'track order'"
```

## Response Formats

### Restaurant List
```
🍽️ Restoran terdekat untuk "sushi":

1. Sushi Tei
   ⭐ 4.7 (500+ reviews) | 📍 1.5 km
   ⏱️ 30-40 min | 💰 Rp 50.000-150.000
   🏷️ Promo: Diskon 20%

2. Ichiban Sushi
   ⭐ 4.5 (200+ reviews) | 📍 2.0 km
   ⏱️ 35-45 min | 💰 Rp 40.000-100.000

3. ...

Pilih nomor untuk lihat menu
```

### Order Tracking
```
📦 Status Pesanan GF-123456

✅ Pesanan diterima (14:05)
✅ Restoran memproses (14:08)
🔄 Driver menuju restoran (14:15)
⏳ Dalam perjalanan ke kamu
⏳ Sampai di lokasi

Driver: Pak Budi (Motor)
📞 +62812-xxx-xxxx

Estimasi tiba: 14:30 (15 menit lagi)
```

## Error Handling

### Login Required
```
⚠️ Kamu perlu login ke GrabFood dulu.

Buka link ini di browser:
[GrabFood login link]

Setelah login, bilang "sudah" ya!
```

### Restaurant Closed
```
😔 Maaf, Warung Pak Eko sedang tutup.

Buka lagi jam 10:00 besok.
Mau cari restoran lain?
```

### Out of Stock
```
⚠️ Nasi Goreng Seafood sedang tidak tersedia.

Mau ganti yang lain?
```

### Payment Failed
```
❌ Pembayaran gagal.

Kemungkinan penyebab:
- Saldo GrabPay tidak cukup
- Masalah koneksi

Mau coba lagi atau ganti metode bayar?
```

## Browser Automation Notes

### Selectors (may change)
These selectors are for reference and may need updates:
- Restaurant card: `.restaurant-card`
- Menu item: `.menu-item`
- Add to cart button: `button[data-testid="add-to-cart"]`
- Checkout button: `.checkout-btn`

### Rate Limiting
- Add delays between actions (1-2 seconds)
- Don't spam requests
- Implement exponential backoff on errors

### Session Management
- Persist browser session/cookies
- Handle session expiry gracefully
- Re-authenticate when needed

## Files
- `grab-automation.js` - Browser automation script
- `selectors.json` - UI selectors (update when GrabFood UI changes)
