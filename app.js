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
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveBookings() {
  localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
  if (settings.autoBackup) {
    const snapshots = loadJSON(BACKUP_KEY, []);
    snapshots.push({ ts: Date.now(), data: bookings });
    localStorage.setItem(BACKUP_KEY, JSON.stringify(snapshots.slice(-20)));
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
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
    .filter((item) => item.bookingDate.startsWith(thisMonth))
    .reduce((total, item) => total + Number(item.totalAmount || 0), 0);

  document.getElementById("totalBookings").textContent = String(bookings.length);
  document.getElementById("todaysBookings").textContent = String(todaysBookings.length);
  document.getElementById("upcomingBookings").textContent = String(upcomingBookings.length);
  document.getElementById("monthlyRevenue").textContent = `PKR ${monthlyRevenue.toLocaleString()}`;

  const query = searchInput.value.toLowerCase().trim();
  const filtered = bookings.filter((item) => {
    if (!query) return true;
    return (
      item.clientName.toLowerCase().includes(query) ||
      item.contactNumber.toLowerCase().includes(query) ||
      item.bookingId.toLowerCase().includes(query) ||
      item.bookingDate.includes(query)
    );
  });

  bookingsTableBody.innerHTML = filtered
    .slice(0, 50)
    .map(
      (item) => `
      <tr>
        <td>${item.bookingId}</td>
        <td>${escapeHtml(item.clientName)}</td>
        <td>${escapeHtml(item.contactNumber)}</td>
        <td>${escapeHtml(item.bookingDate)}</td>
        <td>${escapeHtml(item.eventType)}</td>
        <td>${item.guests}</td>
        <td>${Number(item.totalAmount).toLocaleString()}</td>
        <td>
          <div class="action-inline">
            <button data-action="edit" data-id="${item.bookingId}">Edit</button>
            <button data-action="delete" data-id="${item.bookingId}" class="secondary">Delete</button>
            <button data-action="slip" data-id="${item.bookingId}">Generate Slip</button>
          </div>
        </td>
      </tr>
    `
    )
    .join("");

  bookingsTableBody.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => handleBookingAction(button.dataset.action, button.dataset.id));
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
  const logo = settings.logo
    ? `<img class="slip-logo" src="${settings.logo}" alt="Farmhouse logo" />`
    : '<div class="slip-logo"></div>';

  bookingSlip.innerHTML = `
    <header class="slip-header">
      ${logo}
      <div class="slip-title">
        <h2>${escapeHtml(settings.farmhouseName)}</h2>
        <p>Luxury Event Venue & Swimming Pool</p>
        <h3 class="slip-badge">BOOKING CONFIRMATION</h3>
      </div>
    </header>

    <section class="slip-section">
      <h4>Guest Details</h4>
      <div class="slip-grid">
        <div><strong>Client Name:</strong> ${escapeHtml(booking.clientName)}</div>
        <div><strong>Contact Number:</strong> ${escapeHtml(booking.contactNumber)}</div>
        <div><strong>Address:</strong> ${escapeHtml(booking.address)}</div>
      </div>
    </section>

    <section class="slip-section">
      <h4>Booking Details</h4>
      <div class="slip-grid">
        <div><strong>Booking ID:</strong> ${escapeHtml(booking.bookingId)}</div>
        <div><strong>Booking Date:</strong> ${escapeHtml(booking.bookingDate)}</div>
        <div><strong>Day:</strong> ${escapeHtml(booking.day)}</div>
        <div><strong>Event Type:</strong> ${escapeHtml(booking.eventType)}</div>
        <div><strong>Time Slot:</strong> ${escapeHtml(booking.timeSlot)}</div>
        <div><strong>Start Time:</strong> ${escapeHtml(booking.startTime)}</div>
        <div><strong>End Time:</strong> ${escapeHtml(booking.endTime)}</div>
        <div><strong>Number of Guests:</strong> ${booking.guests}</div>
      </div>
      <p><strong>Amenities Included:</strong></p>
      <div class="badge-list">${amenities.map((item) => `<span>${item}</span>`).join("")}</div>
    </section>

    <section class="slip-section">
      <h4>Payment Summary</h4>
      <div class="slip-grid">
        <div><strong>Total Booking Amount:</strong> PKR ${Number(booking.totalAmount).toLocaleString()}</div>
        <div><strong>Advance Payment Received:</strong> PKR ${Number(booking.advancePayment).toLocaleString()}</div>
        <div><strong>Remaining Balance:</strong> PKR ${Number(booking.remainingAmount).toLocaleString()}</div>
      </div>
    </section>

    <section class="slip-section terms">
      <h4>Terms & Conditions</h4>
      <ul>${terms.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}</ul>
    </section>

    <footer class="slip-footer">
      <p>${escapeHtml(settings.footerMessage)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(settings.phoneNumber)} &nbsp; | &nbsp; <strong>WhatsApp:</strong> ${escapeHtml(settings.whatsappNumber)}</p>
      <p><strong>Address:</strong> ${escapeHtml(settings.farmhouseAddress)}</p>
    </footer>
  `;
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

function escapeHtml(text) {
  const div = document.createElement("div");
  div.innerText = String(text ?? "");
  return div.innerHTML;
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
