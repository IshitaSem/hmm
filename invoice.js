/* =========================================================
   Glam Aura - Invoice Generator (linked from checkout.html)
   ---------------------------------------------------------
   Fully client-side invoice flow that works on GitHub Pages:
   - Validates the customer details form
   - Builds a premium business invoice
   - Downloads a PDF via jsPDF + html2canvas (CDN)
   - Prints with an A4 layout
   - Opens your Instagram profile in a new tab

   Relies on shared helpers from script.js:
   loadCart(), formatPrice(), getDeliveryFeeForPincode(),
   formatDeliveryFee(), productImages
   ========================================================= */

/* =========================================================
   BUSINESS CONFIGURATION — edit everything here in one place.
   Nothing else in this file needs to change when you update
   these values (invoice layout, PDF export, and print all read
   from these constants).

   Paths (LOGO_PATH, UPI_QR_PATH) are plain relative paths from
   the site root — this works as-is on GitHub Pages. Just drop
   the matching image file into /assets with that exact name.
   If a file is missing, the invoice already falls back to a
   text placeholder automatically (see the onerror handlers
   below), so nothing breaks if you leave an image out.
   ========================================================= */
const BUSINESS_NAME = "GLAM AURA";
const BUSINESS_TAGLINE = "Handcrafted Gift Hampers";
const BUSINESS_EMAIL = "hello@glamaura.com";

// TODO: replace with your real UPI ID before going live.
const UPI_ID = "yourupi@bank";
// TODO: replace with your real phone number before going live.
const BUSINESS_PHONE = "+91-XXXXX-XXXXX";
// TODO: replace with your real business address before going live.
const BUSINESS_ADDRESS = "Your Business Address, City - Pincode";
// TODO: replace with your real website (or remove the line in the
// invoice template at ~line 284 if you don't have one).
const BUSINESS_WEBSITE = "www.yourwebsite.com";

// TODO: drop a real QR code image at this path (or change the path).
// Falls back to a text placeholder automatically if missing.
const UPI_QR_PATH = "assets/upi-qr.png";
// TODO: drop a real logo image at this path (or change the path).
// Falls back to a monogram placeholder automatically if missing.
const LOGO_PATH = "assets/logo.png";

// Instagram handle shown in the invoice footer. Sourced from
// INSTAGRAM_HANDLE in script.js (loaded before this file on
// checkout.html) so the account only has to be set in one place —
// see INSTAGRAM_URL / INSTAGRAM_HANDLE at the top of script.js.
const INSTAGRAM_USERNAME = INSTAGRAM_HANDLE;
/* =============================================================== */

let currentInvoice = { number: "" };

/* ---------- Small helpers ---------- */
function escapeHtml(str) {
    return String(str == null ? "" : str)
        .replace(/&/g, "\x26amp;")
        .replace(/</g, "\x26lt;")
        .replace(/>/g, "\x26gt;")
        .replace(/"/g, "\x26quot;")
        .replace(/'/g, "\x26#39;");
}

function formatDisplayDate(value) {
    if (!value) return "\u2014";
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
}

function formatDisplayTime(value) {
    if (!value) return "";
    const parts = value.split(":");
    if (parts.length < 2) return value;
    const hr = Number(parts[0]);
    if (isNaN(hr)) return value;
    const suffix = hr >= 12 ? "PM" : "AM";
    const hr12 = hr % 12 === 0 ? 12 : hr % 12;
    return `${hr12}:${parts[1]} ${suffix}`;
}

/* ---------- Form validation ---------- */
const REQUIRED_FIELDS = [
    { key: "name", label: "Full Name", id: "custName" },
    { key: "email", label: "Email Address", id: "custEmail" },
    { key: "receiverPhone", label: "Receiver Phone", id: "receiverPhone" },
    { key: "house", label: "House / Flat Number", id: "addressHouse" },
    { key: "street", label: "Street / Area", id: "addressSector" },
    { key: "city", label: "City", id: "custCity" },
    { key: "state", label: "State", id: "addressState" },
    { key: "pincode", label: "Pincode", id: "addressPincode" }
];

function validateCustomerForm(data) {
    const missing = [];

    REQUIRED_FIELDS.forEach(field => {
        const input = document.getElementById(field.id);
        const val = String(data[field.key] || "").trim();
        if (!val) {
            if (input) input.classList.add("has-error");
            missing.push(field.label);
        } else if (input) {
            input.classList.remove("has-error");
        }
    });

    // Email format
    const emailInput = document.getElementById("custEmail");
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        if (emailInput) emailInput.classList.add("has-error");
        missing.push("Valid Email Address");
    }

    // Pincode must be exactly 6 digits
    const pinInput = document.getElementById("addressPincode");
    if (data.pincode && !/^\d{6}$/.test(data.pincode.trim())) {
        if (pinInput) pinInput.classList.add("has-error");
        missing.push("6-digit Pincode");
    }

    // Phone sanity check (10-15 digits incl. separators / country code)
    const phoneInput = document.getElementById("custWhatsApp");
    if (data.whatsapp && !/^[\d\s+\-()]{10,15}$/.test(data.whatsapp.trim())) {
        if (phoneInput) phoneInput.classList.add("has-error");
        missing.push("Valid Phone Number");
    }

    if (missing.length > 0) {
        alert("Please complete the following required fields:\n\n- " + missing.join("\n- "));
        const firstInvalid = document.querySelector("#customerDetailsForm .has-error");
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
            firstInvalid.focus({ preventScroll: true });
        }
        return false;
    }
    return true;
}

// Clear error styling as the user types
document.querySelectorAll("#customerDetailsForm input, #customerDetailsForm textarea, #customerDetailsForm select").forEach(el => {
    el.addEventListener("input", () => el.classList.remove("has-error"));
});

/* ---------- Invoice generation ---------- */
function generateInvoice(customerData) {
    if (!validateCustomerForm(customerData)) return;

    const cart = loadCart();
    if (!cart || !cart.items || cart.items.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    // Reuse existing cart / pricing logic from script.js
    const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalWeight = calculateCartWeight(cart);
    const shippingFee = window.shippingAPI ? window.shippingAPI.calculateShipping(totalWeight) : 0;
    const grandTotal = subtotal + shippingFee;
    const cartCount = getCartCount(cart);

    // Invoice identity (generated locally in the browser)
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const rand = () => Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${datePart}-${rand()}`;
    const orderNumber = `ORD-${datePart}-${rand()}`;
    const invoiceDate = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    currentInvoice.number = invoiceNumber;

    // Address assembly
    const addressParts = [customerData.house, customerData.street, customerData.landmark].filter(Boolean).join(", ");
    const cityLine = [customerData.city, customerData.state].filter(Boolean).join(", ") + (customerData.pincode ? ` - ${customerData.pincode}` : "");

    // Order rows (reuse existing cart item images)
    const itemsRows = cart.items.map(item => {
        const displayName = escapeHtml(item.customName || item.name || "Item");
        const imgSrc = item.image || (typeof productImages !== "undefined" && productImages[item.name]) || "";
        const unitTotal = item.price * item.quantity;
        return `
            <tr>
                <td>
                    <div class="inv-product">
                        <img src="${imgSrc}" alt="${displayName}" onerror="this.style.display='none';">
                        <span>${displayName}</span>
                    </div>
                </td>
                <td>${item.quantity}</td>
                <td>${formatPrice(item.price)}</td>
                <td>${formatPrice(unitTotal)}</td>
            </tr>
        `;
    }).join("");

    const giftMessageBlock = customerData.giftMessage ? `
        <div class="invoice-card">
            <h4>Gift Message</h4>
            <p class="special-requests">"${escapeHtml(customerData.giftMessage)}"</p>
        </div>
    ` : "";

    const specialRequestsBlock = customerData.specialRequests ? `
        <div class="invoice-card">
            <h4>Special Requests</h4>
            <p class="special-requests">"${escapeHtml(customerData.specialRequests)}"</p>
        </div>
    ` : "";

    const deliveryTimeText = customerData.deliveryTime ? ` at ${formatDisplayTime(customerData.deliveryTime)}` : "";

    const invoiceHTML = `
        <div class="invoice-header">
            <div class="invoice-brand">
                <div class="invoice-logo">
                    <img src="${LOGO_PATH}" alt="${BUSINESS_NAME} logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
                    <div class="invoice-logo-fallback">GA</div>
                </div>
                <div>
                    <div class="invoice-business-name">${BUSINESS_NAME}</div>
                    <div class="invoice-business-tagline">${BUSINESS_TAGLINE}</div>
                </div>
            </div>
            <div class="invoice-title-block">
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-meta">
                    <div><b>Invoice No:</b> ${invoiceNumber}</div>
                    <div><b>Date:</b> ${invoiceDate}</div>
                    <div><b>Order No:</b> ${orderNumber}</div>
                </div>
            </div>
        </div>

        <div class="invoice-info-grid">
            <div class="invoice-card">
                <h4>Bill To</h4>
                <p><strong>${escapeHtml(customerData.name)}</strong></p>
                <p>Phone: ${escapeHtml(customerData.whatsapp)}</p>
                <p>Email: ${escapeHtml(customerData.email)}</p>
            </div>
            <div class="invoice-card">
                <h4>Deliver To</h4>
                <p><strong>${escapeHtml(customerData.recipientName)}</strong></p>
                <p>${escapeHtml(addressParts)}</p>
                <p>${escapeHtml(cityLine)}</p>
                <p>Delivery: ${formatDisplayDate(customerData.deliveryDate)}${deliveryTimeText}</p>
                <p>Occasion: ${escapeHtml(customerData.occasion)}</p>
                ${customerData.instagramId ? `<p>Instagram: ${escapeHtml(customerData.instagramId)}</p>` : ''}
            </div>
        </div>

        ${giftMessageBlock}

        <div class="invoice-card">
            <h4>Order Details</h4>
            <div class="invoice-table-wrap">
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Qty</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>${itemsRows}</tbody>
                </table>
            </div>
        </div>

        <div class="invoice-summary">
            <div class="invoice-summary-row"><span>Subtotal (${cartCount} items)</span><span>${formatPrice(subtotal)}</span></div>
            <div class="invoice-summary-row" style="color: #555;"><span>Package Weight</span><span>${totalWeight} grams</span></div>
            <div class="invoice-summary-row"><span>India Post Shipping</span><span>${formatPrice(shippingFee)}</span></div>
            <div class="invoice-summary-row grand"><span>Grand Total</span><span>${formatPrice(grandTotal)}</span></div>
        </div>

        ${specialRequestsBlock}

        <div class="invoice-card payment-card">
            <h4>Payment Details</h4>
            <div class="payment-content">
                <div style="margin-bottom: 1rem; text-align: left;">
                    <p><strong>Method:</strong> ${escapeHtml(customerData.paymentMethod || 'QR/Invoice')}</p>
                    <p><strong>Status:</strong> ${escapeHtml(customerData.paymentStatus || 'Pending')}</p>
                </div>
                ${(customerData.paymentMethod === 'UPI QR' || !customerData.paymentMethod) ? `
                <div class="qr-block">
                    <p class="qr-title">My UPI QR Code</p>
                    <div class="qr-img-wrap">
                        <img src="${UPI_QR_PATH}" alt="UPI QR Code" onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';">
                        <div class="qr-fallback">Scan to<br>Pay</div>
                    </div>
                    <p class="upi-id">UPI ID: ${UPI_ID}</p>
                </div>
                <p class="payment-note">Please complete payment using the QR code above. After payment you can download the invoice, print it, or send it to us while contacting us on Instagram.</p>
                ` : `
                <p class="payment-note">Please send this invoice screenshot to us via Instagram DM to proceed with your payment.</p>
                `}
            </div>
        </div>

        <div class="invoice-footer">
            <p class="thank-you">Thank you for your order!</p>
            <p class="footer-tagline">We hope your hamper brings a smile to someone special.</p>
            <div class="footer-links">
                <span>Instagram: ${INSTAGRAM_USERNAME}</span>
                <span>Phone: ${BUSINESS_PHONE}</span>
                <span>Email: ${BUSINESS_EMAIL}</span>
                <span>Address: ${BUSINESS_ADDRESS}</span>
                <span>Website: ${BUSINESS_WEBSITE}</span>
            </div>
        </div>
    `;

    const invoiceEl = document.getElementById("invoiceSection");
    invoiceEl.innerHTML = invoiceHTML;
    invoiceEl.style.display = "block";

    // Hide the form + old inline bill summary; show the action toolbar
    const form = document.getElementById("customerDetailsForm");
    const oldSummary = document.getElementById("invoiceContainer");
    const actions = document.getElementById("invoiceActions");
    if (form) form.style.display = "none";
    if (oldSummary) oldSummary.style.display = "none";
    if (actions) actions.style.display = "flex";

    setTimeout(() => invoiceEl.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
}

/* ---------- PDF download (jsPDF + html2canvas) ---------- */
function ensureImagesLoaded(container) {
    const imgs = Array.from(container.querySelectorAll("img"));
    return Promise.all(imgs.map(img => {
        if (img.complete && img.naturalWidth > 0) return Promise.resolve();
        return new Promise(resolve => {
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
            setTimeout(resolve, 3000); // safety timeout
        });
    }));
}

async function downloadInvoicePDF() {
    if (!window.jspdf || !window.html2canvas) {
        alert("PDF libraries are not loaded. Please check your internet connection and try again.");
        return;
    }

    const invoiceEl = document.getElementById("invoiceSection");
    if (!invoiceEl || invoiceEl.style.display === "none") {
        alert("Please generate the invoice first.");
        return;
    }

    const previousWidth = invoiceEl.style.width || "";
    try {
        // A4 width at 96 DPI so the PDF matches the on-screen layout
        invoiceEl.style.width = "794px";

        await ensureImagesLoaded(invoiceEl);
        if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
        }

        const canvas = await html2canvas(invoiceEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false
        });

        invoiceEl.style.width = previousWidth;

        const imgData = canvas.toDataURL("image/jpeg", 0.95);
        const pdf = new jspdf.jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pageWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
            position -= pageHeight;
            pdf.addPage();
            pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        const fileName = currentInvoice.number ? `Glam-Aura-${currentInvoice.number}.pdf` : "Glam-Aura-Invoice.pdf";
        pdf.save(fileName);
    } catch (err) {
        console.error("PDF generation failed:", err);
        invoiceEl.style.width = previousWidth; // cleanup
        alert("Could not generate the PDF. Please try again.");
    }
}

/* ---------- Print ---------- */
function printInvoice() {
    window.print();
}

/* ---------- Instagram ---------- */
function openInstagramContact() {
    window.open(INSTAGRAM_URL, "_blank", "noopener,noreferrer");
}

/* ---------- Back to shopping ---------- */
function backToShopping() {
    window.location.href = "index.html";
}

/* ---------- Wire up action buttons ---------- */
document.getElementById("downloadPdfBtn")?.addEventListener("click", downloadInvoicePDF);
document.getElementById("printInvoiceBtn")?.addEventListener("click", printInvoice);
document.getElementById("instagramContactBtn")?.addEventListener("click", openInstagramContact);
document.getElementById("backToShopBtn")?.addEventListener("click", backToShopping);

