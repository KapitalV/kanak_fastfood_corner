# 🍛 Kanak FoodCoat — Food Delivery Webstore

A fast, responsive, and aesthetically modern Indian food delivery web application built with **HTML5**, **CSS3**, and **Vanilla JavaScript**. Delivering hot, fresh food from local kitchens to doorsteps in 40 minutes or less within a 20 km radius.

---

## 🌟 Project Overview

**Kanak FoodCoat** provides a seamless online ordering experience for authentic Indian cuisine. The webstore features a landing page with hero location checking and featured dishes, alongside a rich, interactive menu page with real-time food filtering, an interactive shopping cart drawer, coupon application, and checkout workflow.

---

## 🚀 Key Features

### 🏡 1. Landing & Hero Page (`index.html`)
* **Hero Search & Location Checker**: Interactive address input with 20 km radius verification.
* **Featured Categories & Dishes**: Fast navigation to Biryani, North Indian, Dosa, Snacks, and Desserts.
* **Express Delivery Banner**: Highlighting 40-minute express delivery guarantee.
* **Customer Testimonials & Ratings**: Trust badges and verified customer reviews.
* **Sticky Navigation Header**: Split-color brand logo (🟠 **Kanak** 🟢 **FoodCoat**), quick links, cart counter badge, and responsive mobile navigation drawer.

### 🍽️ 2. Interactive Menu & Ordering (`menu.html`)
* **Category Filtering**: Filter dishes by Starters, Biryani, Main Course, Breads, Desserts, and Beverages.
* **Dietary Toggle**: Instant Veg / Non-Veg toggle for strict dietary preferences.
* **Real-time Search Bar**: Fast dynamic searching across dish names and descriptions.
* **Slide-Out Cart Drawer**:
  * Real-time item additions & quantity adjustments (+ / -).
  * Auto-calculated subtotal, GST/taxes, and delivery fee.
  * Promo code & coupon discount engine.
  * LocalStorage persistence to keep cart state across reloads.
* **Checkout Modal**: Interactive checkout flow for address confirmation and payment mode selection (COD, UPI, Cards).

---

## 🎨 Brand & Design System

* **Brand Wordmark**: **`Kanak`** `#FC8019` (Warm Orange) + **`FoodCoat`** `#16A34A` (Fresh Green)
* **Typography**: [Inter](https://fonts.google.com/specimen/Inter) font family via Google Fonts CDN.

### Color Palette

| Token Name | Hex Code | Usage |
| :--- | :--- | :--- |
| **Primary CTA Orange** | `#FC8019` | Main buttons, active states, brand accent |
| **Secondary Green** | `#16A34A` | Veg badges, brand accent, success highlights |
| **Background** | `#FFFFFF` | Primary page background |
| **Surface Card** | `#F8FAFC` | Card backgrounds & neutral section fills |
| **Text Primary** | `#111827` | Headings & main body text |
| **Text Secondary** | `#6B7280` | Subtitles & secondary labels |
| **Footer Background** | `#111111` | Near-black contrast footer background |

---

## 📁 Repository Structure

```
WEBSTORE/
├── index.html                           # Landing page with hero section & featured highlights
├── menu.html                            # Full food catalog, category filters & interactive cart drawer
├── KanakFoodCoat_AI_Agent_Prompt.md     # Architectural prompt and design specifications
└── README.md                            # Project documentation (this file)
```

---

## 🛠️ How to Run Locally

No external build tools or node dependencies are strictly required. You can serve the static files using any lightweight HTTP server.

### Option 1: Using `http-server` (Node.js / npx)
Run the server on port **5555**:
```bash
npx http-server -p 5555
```
Then open your browser and navigate to:
* **Landing Page**: [http://localhost:5555/index.html](http://localhost:5555/index.html)
* **Menu Page**: [http://localhost:5555/menu.html](http://localhost:5555/menu.html)

### Option 2: Using Python Built-in HTTP Server
```bash
python -m http.server 5555
```

### Option 3: VS Code Live Server Extension
1. Open the project folder in VS Code.
2. Right-click `index.html` or `menu.html`.
3. Select **Open with Live Server**.

---

## 🔮 Future Roadmap

- [ ] **Backend API Integration**: Connect to Supabase or Node.js/Express backend for live menu management.
- [ ] **Payment Gateway**: Integrate Razorpay / Stripe for online digital payments.
- [ ] **Real-time Order Tracking**: Live delivery tracking map powered by WebSockets.
- [ ] **User Authentication**: Login / Signup with order history and saved delivery addresses.

---

## 📜 License

This project is created for **Kanak FoodCoat**. All rights reserved.
