/*
  NEIGHBOR'S KITCHEN — order flow
  BEFORE PUBLISHING:
  1) Replace the 0 prices below with your real menu prices.
  2) Put your GCash QR image in this folder and name it gcash-qr.png.
  3) Confirm the Web3Forms access key and email notification setup.
*/
const WEB3FORMS_ACCESS_KEY = "eb96819d-fa60-42aa-82bc-1e6394e1e9e9";

const MENU = [
  { id: "chicken", name: "Chicken Empanada", price: 15 },
  { id: "pork", name: "Pork Empanada", price: 15 },
  { id: "vegetable", name: "Vegetable Empanada", price: 15 },
  { id: "ngohiong", name: "Ngohiong", price: 10 }
];

const $ = (id) => document.getElementById(id);
const peso = (amount) => "₱" + Number(amount).toLocaleString("en-PH", {
  minimumFractionDigits: 2, maximumFractionDigits: 2
});

let nextItemId = 1;
let orderItems = [];
let orderSnapshot = null;

const orderForm = $("orderForm");
const deliveryForm = $("deliveryForm");
const itemsContainer = $("orderItems");

function setStatus(message, isError = false) {
  const status = $("formStatus");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function showStep(stepId) {
  ["stepOrder", "stepPayment", "stepDelivery", "stepSuccess"].forEach((id) => {
    $(id).classList.toggle("hidden", id !== stepId);
  });
  setStatus("");
  if (stepId === "stepPayment" || stepId === "stepDelivery") {
    $("order").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function createOrderItem() {
  const item = { rowId: nextItemId++, menuId: MENU[0].id, quantity: 1 };
  orderItems.push(item);
  renderOrderItems();
}

function renderOrderItems() {
  itemsContainer.innerHTML = "";
  orderItems.forEach((item) => {
    const row = document.createElement("div");
    row.className = "order-item";

    const foodLabel = document.createElement("label");
    foodLabel.textContent = "Food item";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "Choose food item");
    MENU.forEach((food) => {
      const option = document.createElement("option");
      option.value = food.id;
      option.textContent = food.name;
      select.appendChild(option);
    });
    select.value = item.menuId;
    select.addEventListener("change", () => {
      item.menuId = select.value;
      updateTotal();
    });
    foodLabel.appendChild(select);

    const qtyLabel = document.createElement("label");
    qtyLabel.textContent = "Quantity";
    const qty = document.createElement("input");
    qty.type = "number";
    qty.min = "1";
    qty.max = "99";
    qty.step = "1";
    qty.value = String(item.quantity);
    qty.required = true;
    qty.setAttribute("aria-label", "Quantity");
    qty.addEventListener("change", () => {
      const value = Number.parseInt(qty.value, 10);
      item.quantity = Number.isFinite(value) ? Math.max(1, Math.min(99, value)) : 1;
      qty.value = String(item.quantity);
      updateTotal();
    });
    qtyLabel.appendChild(qty);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "remove-item";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove item");
    remove.disabled = orderItems.length === 1;
    remove.style.opacity = remove.disabled ? ".3" : "1";
    remove.addEventListener("click", () => {
      if (orderItems.length <= 1) return;
      orderItems = orderItems.filter((entry) => entry.rowId !== item.rowId);
      renderOrderItems();
      updateTotal();
    });

    row.append(foodLabel, qtyLabel, remove);
    itemsContainer.appendChild(row);
  });
  updateTotal();
}

function getTotal() {
  return orderItems.reduce((sum, item) => {
    const food = MENU.find((entry) => entry.id === item.menuId);
    return sum + (food ? food.price * item.quantity : 0);
  }, 0);
}

function pricesConfigured() {
  return MENU.every((food) => Number.isFinite(food.price) && food.price > 0);
}

function updateTotal() {
  $("orderTotal").textContent = peso(getTotal());
  $("priceSetupNote").classList.toggle("hidden", pricesConfigured());
}

function describeOrder(items) {
  return items.map((item) => {
    const food = MENU.find((entry) => entry.id === item.menuId);
    return `${food ? food.name : item.menuId} × ${item.quantity}`;
  }).join("\n");
}

orderForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!orderForm.reportValidity()) return;
  if (!pricesConfigured()) {
    setStatus("Please set all four menu prices in script.js before taking orders.", true);
    return;
  }
  orderSnapshot = {
    name: $("customerName").value.trim(),
    email: $("customerEmail").value.trim(),
    items: orderItems.map((item) => ({ menuId: item.menuId, quantity: item.quantity })),
    total: getTotal()
  };
  $("paymentTotal").textContent = peso(orderSnapshot.total);
  $("gcashQr").style.display = "";
  $("qrPlaceholder").style.display = "none";
  showStep("stepPayment");
});

$("addItemBtn").addEventListener("click", () => {
  createOrderItem();
});

$("backToOrder").addEventListener("click", () => showStep("stepOrder"));

$("continueBtn").addEventListener("click", () => {
  if (!orderSnapshot) {
    showStep("stepOrder");
    setStatus("Please complete your order first.", true);
    return;
  }
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  $("deliveryTime").min = now.toISOString().slice(0, 16);
  $("finalOrderSummary").textContent =
    `${describeOrder(orderSnapshot.items)}\nTotal: ${peso(orderSnapshot.total)}`;
  showStep("stepDelivery");
});

$("backToPayment").addEventListener("click", () => showStep("stepPayment"));

deliveryForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!deliveryForm.reportValidity()) return;
  if (!orderSnapshot) {
    setStatus("Your order details were not found. Please start again.", true);
    showStep("stepOrder");
    return;
  }

  const submitButton = $("submitOrderBtn");
  const originalText = submitButton.innerHTML;
  submitButton.disabled = true;
  submitButton.textContent = "Sending order…";
  setStatus("");

  const foodSummary = describeOrder(orderSnapshot.items);
  const message = [
    "NEW APARTMENT FOOD ORDER",
    "",
    `Customer: ${orderSnapshot.name}`,
    `Customer email: ${orderSnapshot.email}`,
    "",
    "Items:",
    foodSummary,
    "",
    `Order total: ${peso(orderSnapshot.total)}`,
    `Preferred delivery time: ${$("deliveryTime").value}`,
    `Building / room number: ${$("roomNumber").value.trim()}`,
    `Last 4 digits of GCash reference #: ${$("referenceDigits").value.trim()}`,
    `Delivery notes: ${$("deliveryNotes").value.trim() || "None"}`,
    "",
    "Note: Payment has not been automatically verified. Please check GCash before fulfilling."
  ].join("\n");

  const formData = new FormData();
  formData.append("access_key", WEB3FORMS_ACCESS_KEY);
  formData.append("subject", `New food order — ${orderSnapshot.name} — ${peso(orderSnapshot.total)}`);
  formData.append("from_name", "Neighbor's Kitchen Order Form");
  formData.append("name", orderSnapshot.name);
  formData.append("email", orderSnapshot.email);
  formData.append("message", message);
  formData.append("botcheck", "");

  try {
    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      body: formData
    });
    const result = await response.json();

    if (response.ok && result.success) {
      showStep("stepSuccess");
    } else {
      setStatus(result.message || "We couldn't send your order. Please try again.", true);
    }
  } catch (error) {
    setStatus("Connection error. Check your internet connection and try again.", true);
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = originalText;
  }
});

$("newOrderBtn").addEventListener("click", () => {
  orderForm.reset();
  deliveryForm.reset();
  orderSnapshot = null;
  orderItems = [];
  nextItemId = 1;
  createOrderItem();
  showStep("stepOrder");
  $("order").scrollIntoView({ behavior: "smooth", block: "start" });
});

createOrderItem();
