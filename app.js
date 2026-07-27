const BOOKING_KEY = "farmhouse_bookings_v1";
const SETTINGS_KEY = "farmhouse_settings_v1";
const BACKUP_KEY = "farmhouse_backups_v1";

const defaultSettings = {
  farmhouseName: "AKRAM FARM HOUSE",
  logo: "",
  phoneNumber: "+92-300-0000000",
  whatsappNumber: "+92-300-0000000",
  farmhouseAddress: "Farmhouse Road, City",
  footerMessage:
    "Thank you for choosing AKRAM FARM HOUSE. We are delighted to host you and your guests. We look forward to welcoming you and hope you enjoy a memorable experience. For any assistance before your booking date, please feel free to contact us. Have a wonderful day, and see you soon!",
  autoBackup: true,
};

const amenities = [
  "Swimming Pool",
  "Fully Air Conditioned (AC)",
  "Main Hall",
  "Bedroom with Attached Bath",
  "Kitchen",
  "Refrigerator",
  "Spacious Lawn",
  "BBQ Setup",
  "Parking",
  "Washrooms",
];

const terms = [
  "Remaining payment must be paid before check-in.",
  "Guests are fully responsible for any damage caused to the farmhouse property during their booking.",
  "Any damage charges will be recovered from the guest.",
  "Illegal activities are strictly prohibited inside the farmhouse premises.",
  "Additional guests beyond the booked limit may incur extra charges.",
  "Please follow the booked check-in and check-out timings.",
];

let bookings = loadJSON(BOOKING_KEY, []);
let settings = { ...defaultSettings, ...loadJSON(SETTINGS_KEY, {}) };
let editingBookingId = null;
let selectedSlipBookingId = null;

const bookingForm = document.getElementById("bookingForm");
const settingsForm = document.getElementById("settingsForm");
const bookingsTableBody = document.getElementById("bookingsTableBody");
const searchInput = document.getElementById("searchInput");
const bookingDateInput = document.getElementById("bookingDate");
const dayInput = document.getElementById("day");
const totalAmountInput = document.getElementById("totalAmount");
const advancePaymentInput = document.getElementById("advancePayment");
const remainingAmountInput = document.getElementById("remainingAmount");
const bookingIdInput = document.getElementById("bookingId");
const slipDialog = document.getElementById("slipDialog");
const bookingSlip = document.getElementById("bookingSlip");

initialize();

function initialize() {
  setupTabs();
  setupFormBehaviors();
  setupSettings();
  setupBackupControls();
  setupSlipActions();
  resetBookingForm();
  renderDashboard();
  registerServiceWorker();
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(decodeStoredPayload(raw)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveBookings() {
  localStorage.setItem(BOOKING_KEY, encodeStoredPayload(JSON.stringify(bookings)));
  if (settings.autoBackup) {
    const snapshots = loadJSON(BACKUP_KEY, []);
    snapshots.push({ ts: Date.now(), data: bookings });
    localStorage.setItem(BACKUP_KEY, encodeStoredPayload(JSON.stringify(snapshots.slice(-20))));
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, encodeStoredPayload(JSON.stringify(settings)));
}

function generateBookingId() {
  return `BKG-${Date.now().toString().slice(-8)}`;
}

function setupTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((btn) => btn.classList.remove("active"));
      document
        .querySelectorAll(".tab-content")
        .forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
}

function setupFormBehaviors() {
  bookingDateInput.addEventListener("change", () => {
    dayInput.value = bookingDateInput.value ? getDayFromDate(bookingDateInput.value) : "";
  });

  [totalAmountInput, advancePaymentInput].forEach((input) => {
    input.addEventListener("input", updateRemaining);
  });

  bookingForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(bookingForm);
    const record = {
      bookingId: bookingIdInput.value,
      clientName: formData.get("clientName")?.toString().trim(),
      contactNumber: formData.get("contactNumber")?.toString().trim(),
      address: formData.get("address")?.toString().trim(),
      bookingDate: formData.get("bookingDate"),
      day: dayInput.value,
      timeSlot: formData.get("timeSlot")?.toString().trim(),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      eventType: formData.get("eventType"),
      guests: Number(formData.get("guests") || 0),
      totalAmount: Number(formData.get("totalAmount") || 0),
      advancePayment: Number(formData.get("advancePayment") || 0),
      remainingAmount: Number(remainingAmountInput.value || 0),
      specialNotes: formData.get("specialNotes")?.toString().trim() || "",
      updatedAt: new Date().toISOString(),
      createdAt: editingBookingId
        ? bookings.find((item) => item.bookingId === editingBookingId)?.createdAt || new Date().toISOString()
        : new Date().toISOString(),
    };

    if (editingBookingId) {
      bookings = bookings.map((item) => (item.bookingId === editingBookingId ? record : item));
    } else {
      bookings.unshift(record);
    }

    saveBookings();
    renderDashboard();
    resetBookingForm();
    activateTab("dashboard");
  });

  document.getElementById("resetFormBtn").addEventListener("click", resetBookingForm);
  searchInput.addEventListener("input", renderDashboard);
}

function setupSettings() {
  settingsForm.elements.farmhouseName.value = settings.farmhouseName;
  settingsForm.elements.phoneNumber.value = settings.phoneNumber;
  settingsForm.elements.whatsappNumber.value = settings.whatsappNumber;
  settingsForm.elements.farmhouseAddress.value = settings.farmhouseAddress;
  settingsForm.elements.footerMessage.value = settings.footerMessage;
  settingsForm.elements.autoBackup.checked = Boolean(settings.autoBackup);

  document.getElementById("logoInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    settings.logo = await fileToDataUrl(file);
    saveSettings();
  });

  settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(settingsForm);
    settings = {
      ...settings,
      farmhouseName: formData.get("farmhouseName")?.toString().trim(),
      phoneNumber: formData.get("phoneNumber")?.toString().trim(),
      whatsappNumber: formData.get("whatsappNumber")?.toString().trim(),
      farmhouseAddress: formData.get("farmhouseAddress")?.toString().trim(),
      footerMessage: formData.get("footerMessage")?.toString().trim(),
      autoBackup: settingsForm.elements.autoBackup.checked,
    };
    saveSettings();
    if (selectedSlipBookingId) {
      const current = bookings.find((item) => item.bookingId === selectedSlipBookingId);
      if (current) renderSlip(current);
    }
    alert("Settings saved successfully.");
  });
}

function setupBackupControls() {
  document.getElementById("exportJsonBtn").addEventListener("click", () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      bookings,
      settings,
      backups: loadJSON(BACKUP_KEY, []),
    };
    downloadFile("bookings.json", JSON.stringify(payload, null, 2), "application/json");
  });

  document.getElementById("importJsonInput").addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      bookings = Array.isArray(parsed) ? parsed : parsed.bookings || [];
      if (parsed.settings) {
        settings = { ...defaultSettings, ...parsed.settings };
        saveSettings();
        settingsForm.elements.farmhouseName.value = settings.farmhouseName;
        settingsForm.elements.phoneNumber.value = settings.phoneNumber;
        settingsForm.elements.whatsappNumber.value = settings.whatsappNumber;
        settingsForm.elements.farmhouseAddress.value = settings.farmhouseAddress;
        settingsForm.elements.footerMessage.value = settings.footerMessage;
        settingsForm.elements.autoBackup.checked = Boolean(settings.autoBackup);
      }
      saveBookings();
      renderDashboard();
      alert("Backup imported successfully.");
    } catch {
      alert("Invalid JSON file.");
    }
    event.target.value = "";
  });
}

function renderDashboard() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const todaysBookings = bookings.filter((item) => item.bookingDate === today);
  const upcomingBookings = bookings.filter((item) => item.bookingDate > today);
  const monthlyRevenue = bookings
    .filter((item) => String(item.bookingDate || "").startsWith(thisMonth))
    .reduce((total, item) => total + Number(item.totalAmount || 0), 0);

  document.getElementById("totalBookings").textContent = String(bookings.length);
  document.getElementById("todaysBookings").textContent = String(todaysBookings.length);
  document.getElementById("upcomingBookings").textContent = String(upcomingBookings.length);
  document.getElementById("monthlyRevenue").textContent = `PKR ${monthlyRevenue.toLocaleString()}`;

  const query = searchInput.value.toLowerCase().trim();
  const filtered = bookings.filter((item) => {
    if (!query) return true;
    const client = String(item.clientName ?? "").toLowerCase();
    const contact = String(item.contactNumber ?? "").toLowerCase();
    const bookingId = String(item.bookingId ?? "").toLowerCase();
    const bookingDate = String(item.bookingDate ?? "");
    return (
      client.includes(query) ||
      contact.includes(query) ||
      bookingId.includes(query) ||
      bookingDate.includes(query)
    );
  });

  bookingsTableBody.textContent = "";
  filtered.slice(0, 50).forEach((item) => {
    const row = document.createElement("tr");
    [
      item.bookingId,
      item.clientName,
      item.contactNumber,
      item.bookingDate,
      item.eventType,
      String(item.guests),
      Number(item.totalAmount || 0).toLocaleString(),
    ].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value ?? "";
      row.appendChild(td);
    });

    const actionCell = document.createElement("td");
    const actionWrap = document.createElement("div");
    actionWrap.className = "action-inline";
    [
      { label: "Edit", action: "edit", secondary: false },
      { label: "Delete", action: "delete", secondary: true },
      { label: "Generate Slip", action: "slip", secondary: false },
    ].forEach((itemAction) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = itemAction.label;
      button.dataset.action = itemAction.action;
      if (itemAction.secondary) button.classList.add("secondary");
      button.addEventListener("click", () => handleBookingAction(itemAction.action, item.bookingId));
      actionWrap.appendChild(button);
    });
    actionCell.appendChild(actionWrap);
    row.appendChild(actionCell);
    bookingsTableBody.appendChild(row);
  });
}

function handleBookingAction(action, bookingId) {
  const booking = bookings.find((item) => item.bookingId === bookingId);
  if (!booking) return;

  if (action === "edit") {
    editingBookingId = booking.bookingId;
    bookingIdInput.value = booking.bookingId;
    bookingForm.elements.clientName.value = booking.clientName;
    bookingForm.elements.contactNumber.value = booking.contactNumber;
    bookingForm.elements.address.value = booking.address;
    bookingForm.elements.bookingDate.value = booking.bookingDate;
    bookingForm.elements.day.value = booking.day;
    bookingForm.elements.timeSlot.value = booking.timeSlot;
    bookingForm.elements.startTime.value = booking.startTime;
    bookingForm.elements.endTime.value = booking.endTime;
    bookingForm.elements.eventType.value = booking.eventType;
    bookingForm.elements.guests.value = booking.guests;
    bookingForm.elements.totalAmount.value = booking.totalAmount;
    bookingForm.elements.advancePayment.value = booking.advancePayment;
    bookingForm.elements.remainingAmount.value = booking.remainingAmount;
    bookingForm.elements.specialNotes.value = booking.specialNotes;
    activateTab("new-booking");
  }

  if (action === "delete") {
    if (!confirm(`Delete booking ${bookingId}?`)) return;
    bookings = bookings.filter((item) => item.bookingId !== bookingId);
    saveBookings();
    renderDashboard();
  }

  if (action === "slip") {
    selectedSlipBookingId = bookingId;
    renderSlip(booking);
    slipDialog.showModal();
  }
}

function renderSlip(booking) {
  bookingSlip.innerHTML = `
    <header class="slip-header">
      <div id="slipLogoContainer"></div>
      <div class="slip-title">
        <h2 id="slipFarmhouseName"></h2>
        <p>Luxury Event Venue & Swimming Pool</p>
        <h3 class="slip-badge">BOOKING CONFIRMATION</h3>
      </div>
    </header>

    <section class="slip-section">
      <h4>Guest Details</h4>
      <div class="slip-grid" id="guestDetailsGrid"></div>
    </section>

    <section class="slip-section">
      <h4>Booking Details</h4>
      <div class="slip-grid" id="bookingDetailsGrid"></div>
      <p><strong>Amenities Included:</strong></p>
      <div class="badge-list" id="amenitiesList"></div>
    </section>

    <section class="slip-section">
      <h4>Payment Summary</h4>
      <div class="slip-grid" id="paymentDetailsGrid"></div>
    </section>

    <section class="slip-section terms">
      <h4>Terms & Conditions</h4>
      <ul id="termsList"></ul>
    </section>

    <footer class="slip-footer">
      <p id="slipFooterMessage"></p>
      <p><strong>Phone:</strong> <span id="slipPhone"></span> &nbsp; | &nbsp; <strong>WhatsApp:</strong> <span id="slipWhatsapp"></span></p>
      <p><strong>Address:</strong> <span id="slipAddress"></span></p>
    </footer>
  `;

  const logoContainer = document.getElementById("slipLogoContainer");
  const logoElement = document.createElement(settings.logo ? "img" : "div");
  logoElement.className = "slip-logo";
  if (settings.logo && isSafeLogoSource(settings.logo)) {
    logoElement.src = settings.logo;
    logoElement.alt = "Farmhouse logo";
  }
  logoContainer.appendChild(logoElement);

  document.getElementById("slipFarmhouseName").textContent = settings.farmhouseName;
  fillDetailGrid("guestDetailsGrid", [
    ["Client Name:", booking.clientName],
    ["Contact Number:", booking.contactNumber],
    ["Address:", booking.address],
  ]);
  fillDetailGrid("bookingDetailsGrid", [
    ["Booking ID:", booking.bookingId],
    ["Booking Date:", booking.bookingDate],
    ["Day:", booking.day],
    ["Event Type:", booking.eventType],
    ["Time Slot:", booking.timeSlot],
    ["Start Time:", booking.startTime],
    ["End Time:", booking.endTime],
    ["Number of Guests:", String(booking.guests)],
  ]);
  fillDetailGrid("paymentDetailsGrid", [
    ["Total Booking Amount:", `PKR ${Number(booking.totalAmount).toLocaleString()}`],
    ["Advance Payment Received:", `PKR ${Number(booking.advancePayment).toLocaleString()}`],
    ["Remaining Balance:", `PKR ${Number(booking.remainingAmount).toLocaleString()}`],
  ]);

  const amenityContainer = document.getElementById("amenitiesList");
  amenities.forEach((item) => {
    const badge = document.createElement("span");
    badge.textContent = item;
    amenityContainer.appendChild(badge);
  });

  const termsList = document.getElementById("termsList");
  terms.forEach((term) => {
    const li = document.createElement("li");
    li.textContent = term;
    termsList.appendChild(li);
  });

  document.getElementById("slipFooterMessage").textContent = settings.footerMessage;
  document.getElementById("slipPhone").textContent = settings.phoneNumber;
  document.getElementById("slipWhatsapp").textContent = settings.whatsappNumber;
  document.getElementById("slipAddress").textContent = settings.farmhouseAddress;
}

function setupSlipActions() {
  document.getElementById("closeSlipBtn").addEventListener("click", () => slipDialog.close());
  document.getElementById("printSlipBtn").addEventListener("click", () => window.print());
  document.getElementById("downloadPdfBtn").addEventListener("click", () => window.print());

  document.getElementById("shareWhatsappBtn").addEventListener("click", () => {
    const booking = bookings.find((item) => item.bookingId === selectedSlipBookingId);
    if (!booking) return;
    const text = encodeURIComponent(
      `${settings.farmhouseName} Booking Confirmation\nBooking ID: ${booking.bookingId}\nClient: ${booking.clientName}\nDate: ${booking.bookingDate}\nPlease find attached confirmation slip PDF.`
    );
    window.open(`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=${text}`, "_blank");
  });

  document.getElementById("shareEmailBtn").addEventListener("click", () => {
    const booking = bookings.find((item) => item.bookingId === selectedSlipBookingId);
    if (!booking) return;
    const subject = encodeURIComponent(`${settings.farmhouseName} Booking Confirmation ${booking.bookingId}`);
    const body = encodeURIComponent(
      `Dear ${booking.clientName},\n\nYour booking is confirmed for ${booking.bookingDate}.\nPlease find your booking confirmation attached as PDF.\n\nRegards,\n${settings.farmhouseName}`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  });

  document.getElementById("nativeShareBtn").addEventListener("click", async () => {
    const booking = bookings.find((item) => item.bookingId === selectedSlipBookingId);
    if (!booking || !navigator.share) {
      alert("Native share is not supported on this device.");
      return;
    }
    await navigator.share({
      title: `${settings.farmhouseName} Booking Confirmation`,
      text: `Booking ${booking.bookingId} for ${booking.clientName} on ${booking.bookingDate}`,
    });
  });
}

function resetBookingForm() {
  editingBookingId = null;
  bookingForm.reset();
  bookingIdInput.value = generateBookingId();
  dayInput.value = "";
  remainingAmountInput.value = "0";
}

function updateRemaining() {
  const total = Number(totalAmountInput.value || 0);
  const advance = Number(advancePaymentInput.value || 0);
  remainingAmountInput.value = String(Math.max(total - advance, 0));
}

function getDayFromDate(date) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long" });
}

function activateTab(tabId) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === tabId));
  document
    .querySelectorAll(".tab-content")
    .forEach((panel) => panel.classList.toggle("active", panel.id === tabId));
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function fillDetailGrid(containerId, entries) {
  const container = document.getElementById(containerId);
  entries.forEach(([label, value]) => {
    const row = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = `${label} `;
    row.appendChild(strong);
    row.appendChild(document.createTextNode(String(value ?? "")));
    container.appendChild(row);
  });
}

function encodeStoredPayload(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeStoredPayload(value) {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return value;
  }
}

function isSafeLogoSource(src) {
  return src.startsWith("data:image/") || src.startsWith("https://") || src.startsWith("http://");
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
