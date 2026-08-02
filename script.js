// Navigation behavior
const cartCountEl = document.getElementById('cartCount');
const cartIcon = document.querySelector('.cart-icon');
const cartDrawerOverlay = document.getElementById('cartDrawerOverlay');
const drawerClose = document.getElementById('drawerClose');
const cartItemsContainer = document.getElementById('cartItems');
const cartNoteTextarea = document.getElementById('cartNote');
const cartDrawerCount = document.getElementById('cartDrawerCount');
const cartTotalEl = document.getElementById('cartTotal');
const cartSummaryBar = document.getElementById('cartSummaryBar');
const summaryTitle = document.getElementById('summaryTitle');
const summaryPrice = document.getElementById('summaryPrice');
const summaryButton = document.getElementById('summaryButton');
const checkoutButton = document.getElementById('checkoutButton');
const viewCartButton = document.getElementById('viewCartButton');
const checkoutCartContainer = document.getElementById('checkoutCart');
const checkoutNote = document.getElementById('checkoutNote');
const addressPincodeEl = document.getElementById('addressPincode');

const productModalOverlay = document.getElementById('productModalOverlay');
const modalTitle = document.getElementById('modalTitle');
const modalImage = document.getElementById('modalImage');
const modalPrice = document.getElementById('modalPrice');
const modalDescription = document.getElementById('modalDescription');
const modalItemsList = document.getElementById('modalItemsList');
const modalClose = document.getElementById('modalClose');
const modalCloseButton = document.getElementById('modalCloseButton');
const modalAddCartButton = document.getElementById('modalAddCartButton');

let activeModalItem = null;
let currentFilter = 'all';
let currentAvailability = 'all';
let currentSort = 'relevance';

const CART_STORAGE_KEY = 'glamAuraCartData';
const productsInventory = {
    "Hamper 1": { stock: 3 },
    "Hamper 2": { stock: 2 },
    "Hamper 3": { stock: 2 } // 0 means Out of Stock
};

const productImages = {
    "Hamper 1": "assets/hamper1.jpg",
    "Hamper 2": "assets/hamper2.jpg",
    "Hamper 3": "assets/hamper3.jpg",
    "Hamper 4": "assets/custom-hamper.jpg"
};

const deliveryFeeMap = {
    "110001": 50,
    "400001": 60,
    "560001": 75
};

function getDeliveryFeeForPincode(pin) {
    const cleaned = String(pin || '').trim();
    if (!cleaned || cleaned.length !== 6 || !/^[0-9]{6}$/.test(cleaned)) {
        return 0;
    }
    return deliveryFeeMap[cleaned] ?? 50;
}

function formatDeliveryFee(fee) {
    return fee === 0 ? '₹0 (Free)' : formatPrice(fee);
}

// Hide cart summary bar on checkout page
function hideCartSummaryBarOnCheckout() {
    if (checkoutCartContainer && cartSummaryBar) {
        cartSummaryBar.style.display = 'none';
    }
}

function loadCart() {
    const value = localStorage.getItem(CART_STORAGE_KEY);
    if (!value) {
        return { items: [], note: '' };
    }
    try {
        return JSON.parse(value);
    } catch (error) {
        return { items: [], note: '' };
    }
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function getCartCount(cart) {
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartCount() {
    const cart = loadCart();
    const count = getCartCount(cart);
    if (cartCountEl) {
        cartCountEl.textContent = count;
    }
}

function formatPrice(price) {
    return `₹${price}`;
}

function createCartItemHtml(item) {
    return `
        <div class="cart-item" data-item-id="${item.id}">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${formatPrice(item.price)}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="qty-btn minus" data-item-id="${item.id}">−</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn plus" data-item-id="${item.id}">+</button>
            </div>
            ${item.isCustom ? `<div class="cart-item-edit"><button class="edit-custom-btn" onclick="window.location.href='custom-hamper.html?edit=${encodeURIComponent(item.id)}'">Edit</button></div>` : ''}
        </div>
    `;
}

function updateCartDrawer() {
    const cart = loadCart();
    if (!cartDrawerOverlay || !cartItemsContainer || !cartDrawerCount || !cartTotalEl) {
        return;
    }

    cartDrawerCount.textContent = getCartCount(cart);
    cartItemsContainer.innerHTML = cart.items.map((item) => createCartItemHtml(item)).join('') || '<p>Your cart is empty.</p>';
    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cartTotalEl.textContent = formatPrice(total);
    if (cartNoteTextarea) {
        cartNoteTextarea.value = cart.note || '';
    }

    // Add event listeners for quantity buttons
    setupQuantityButtons();
    updateQuantityButtonState();
}

function setupQuantityButtons() {
    const minusButtons = document.querySelectorAll('.qty-btn.minus');
    const plusButtons = document.querySelectorAll('.qty-btn.plus');

    minusButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.itemId;
            updateItemQuantity(itemId, -1);
        });
    });

    plusButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            const itemId = btn.dataset.itemId;
            const cart = loadCart();
            const existing = cart.items.find((entry) => entry.id === itemId);
            const maxAvailable = productsInventory[itemId] ? productsInventory[itemId].stock : 999;
            const currentQty = existing ? existing.quantity : 0;

            if (currentQty >= maxAvailable) {
                return;
            }

            updateItemQuantity(itemId, 1);
        });
    });
}

function updateItemQuantity(itemId, change) {
    const cart = loadCart();
    const item = cart.items.find((entry) => entry.id === itemId);
    if (!item) return;

    const maxAvailable = productsInventory[itemId] ? productsInventory[itemId].stock : 999;
    if (change > 0 && item.quantity >= maxAvailable) {
        return;
    }

    item.quantity += change;
    if (item.quantity <= 0) {
        cart.items = cart.items.filter((entry) => entry.id !== itemId);
    }

    saveCart(cart);
    updateCartDrawer();
    updateCartCount();
    updateCartSummaryBar();
}

function updateQuantityButtonState() {
    const cart = loadCart();
    const plusButtons = document.querySelectorAll('.qty-btn.plus');

    plusButtons.forEach((btn) => {
        const itemId = btn.dataset.itemId;
        const item = cart.items.find((entry) => entry.id === itemId);
        const maxAvailable = productsInventory[itemId] ? productsInventory[itemId].stock : 999;
        const disabled = !item || item.quantity >= maxAvailable;

        btn.disabled = disabled;
        btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
    });
}

function updateCartSummaryBar() {
    const cart = loadCart();
    if (!cartSummaryBar) return;

    if (cart.items.length === 0) {
        cartSummaryBar.classList.remove('active');
        return;
    }

    // Capture the most recent addition to your list
    const latestItem = cart.items[cart.items.length - 1];
    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Completely updates layout to fix floating bar elements
    if (summaryTitle) summaryTitle.textContent = latestItem.name;
    if (summaryPrice) summaryPrice.textContent = formatPrice(total);
    
    cartSummaryBar.classList.add('active');
}

function openDrawer() {
    if (!cartDrawerOverlay) return;
    cartDrawerOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    if (!cartDrawerOverlay) return;
    cartDrawerOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

function addToCart(item) {
    const cart = loadCart();
    const existing = cart.items.find((entry) => entry.id === item.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        cart.items.push({ ...item, quantity: 1 });
    }
    saveCart(cart);
    updateCartCount();
    updateCartDrawer();
    updateCartSummaryBar();

    if (window.innerWidth >= 768) {
        openDrawer();
    } else {
        cartSummaryBar?.classList.add('active');
    }
}

function setCartNote() {
    const cart = loadCart();
    if (!cartNoteTextarea) return;
    cart.note = cartNoteTextarea.value;
    saveCart(cart);
}

function openModal(item) {
    if (!productModalOverlay || !modalTitle || !modalImage || !modalPrice || !modalDescription || !modalItemsList) {
        return;
    }
    activeModalItem = item;
    const isCustom = item.isCustom || item.id === 'Hamper 4';
    modalTitle.textContent = item.name;
    modalImage.textContent = item.image || item.name;
    modalPrice.textContent = isCustom ? '' : formatPrice(item.price);
    modalDescription.textContent = item.description || 'A perfect gift with carefully selected items.';
    const itemList = item.items ? item.items.split('|').map((entry) => entry.trim()).filter(Boolean) : [];
    modalItemsList.innerHTML = itemList.length
        ? itemList.map((entry) => `<li>${entry}</li>`).join('')
        : '<li>Handpicked goodies included.</li>';
    const productModal = document.querySelector('.product-modal');
    if (productModal) {
        productModal.classList.toggle('custom', isCustom);
    }
    if (modalAddCartButton) {
        modalAddCartButton.textContent = isCustom ? 'Curate' : 'Add to cart';
    }
    productModalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    if (!productModalOverlay) return;
    productModalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    activeModalItem = null;
    const productModal = document.querySelector('.product-modal');
    if (productModal) {
        productModal.classList.remove('custom');
    }
}

function setupProductCardModal() {
    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach((card) => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('.add-cart-btn') || event.target.closest('.curate-btn')) {
                return;
            }
            const name = card.dataset.product || card.querySelector('.product-title')?.textContent?.trim();
            const price = Number(card.dataset.price || 0) || 0;
            const image = card.dataset.image || name;
            const items = card.dataset.items || '';
            const description = card.dataset.description || card.querySelector('.product-description')?.textContent?.trim();
            const isCustom = name === 'Hamper 4';
            openModal({ id: name, name, price, image, items, description, isCustom });
        });
    });

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }
    if (modalCloseButton) {
        modalCloseButton.addEventListener('click', closeModal);
    }
    if (modalAddCartButton) {
        modalAddCartButton.addEventListener('click', () => {
            if (!activeModalItem) return;
            if (activeModalItem.isCustom || activeModalItem.id === 'Hamper 4') {
                window.location.href = 'custom-hamper.html';
                return;
            }
            addToCart(activeModalItem);
            closeModal();
        });
    }
    if (productModalOverlay) {
        productModalOverlay.addEventListener('click', (event) => {
            if (event.target === productModalOverlay) {
                closeModal();
            }
        });
    }
}


function setupAddCartButtons() {
    const addCartButtons = document.querySelectorAll('.add-cart-btn');
    addCartButtons.forEach((button) => {
        // Grab item reference clean names
        const itemId = button.dataset.product || button.textContent.replace('Add to Cart', '').trim();
        const itemStockObj = productsInventory[itemId];
        
        // Render current remaining limits directly above the active buttons
        if (itemStockObj && button.parentElement) {
            let stockDisplay = button.parentElement.querySelector('.stock-counter-text');
            if (!stockDisplay) {
                stockDisplay = document.createElement('p');
                stockDisplay.className = 'stock-counter-text';
                stockDisplay.style.cssText = "font-family:'Elms Sans'; font-size:0.85rem; margin:5px 0; font-weight:700; color:#8c4b0f;";
                button.parentNode.insertBefore(stockDisplay, button);
            }
            stockDisplay.textContent = itemStockObj.stock > 0 ? `Only ${itemStockObj.stock} left in stock` : `⚠️ Out of Stock`;
            
            if (itemStockObj.stock <= 0) {
                button.disabled = true;
                button.style.backgroundColor = '#ccc';
                button.style.cursor = 'not-allowed';
                button.textContent = 'Sold Out';
            }
        }

        button.addEventListener('click', () => {
            const itemPrice = Number(button.dataset.price || 99);
            const cart = loadCart();
            const existing = cart.items.find((entry) => entry.id === itemId);
            const currentQty = existing ? existing.quantity : 0;
            const maxAvailable = productsInventory[itemId] ? productsInventory[itemId].stock : 999;

            if (currentQty >= maxAvailable) {
                alert(`Sorry, you cannot add more items. Only ${maxAvailable} units of ${itemId} are available.`);
                return;
            }

            addToCart({
                id: itemId,
                name: itemId,
                price: itemPrice,
                image: productImages[itemId] || ''
            });
        });
    });
}

function initCheckoutListeners() {
    if (checkoutNote) {
        checkoutNote.addEventListener('input', () => {
            const cart = loadCart();
            cart.note = checkoutNote.value;
            saveCart(cart);
        });
    }

    if (addressPincodeEl) {
        addressPincodeEl.addEventListener('input', () => {
            populateCheckoutPage();
        });
    }
}

function setupFilterButtons() {
    const availabilityFilter = document.getElementById('availabilityFilter');
    const priceFilter = document.getElementById('priceFilter');
    const sortFilter = document.getElementById('sortFilter');

    if (availabilityFilter) {
        availabilityFilter.addEventListener('change', (e) => {
            currentAvailability = e.target.value;
            applyFilter();
        });
    }

    if (priceFilter) {
        priceFilter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            applyFilter();
        });
    }

    if (sortFilter) {
        sortFilter.addEventListener('change', (e) => {
            currentSort = e.target.value;
            applySorting();
        });
    }
}

function setupFaqAccordion() {
    const faqButtons = document.querySelectorAll('.faq-question');
    faqButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const faqItem = button.closest('.faq-item');
            if (!faqItem) return;
            const toggleIcon = button.querySelector('.faq-toggle');
            const isOpen = faqItem.classList.toggle('open');
            if (toggleIcon) {
                toggleIcon.textContent = isOpen ? '−' : '+';
            }
        });
    });
}

function applyFilter() {
    const productCards = document.querySelectorAll('.product-card');
    let visibleCount = 0;

    productCards.forEach((card) => {
        const price = Number(card.dataset.price || 0);
        let shouldShow = true;

        if (currentAvailability === 'in-stock') {
            shouldShow = true;
        } else if (currentAvailability === 'out-stock') {
            shouldShow = false;
        }

        if (shouldShow) {
            if (currentFilter === 'all') {
                shouldShow = true;
            } else if (currentFilter === '99') {
                shouldShow = price === 99;
            } else if (currentFilter === '299') {
                shouldShow = price === 299;
            } else if (currentFilter === '499') {
                shouldShow = price === 499;
            }
        }

        card.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
    });

    updateItemCount(visibleCount);
}

function applySorting() {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;

    const cards = Array.from(productGrid.querySelectorAll('.product-card'));

    if (currentSort === 'price-low') {
        cards.sort((a, b) => Number(a.dataset.price) - Number(b.dataset.price));
    } else if (currentSort === 'price-high') {
        cards.sort((a, b) => Number(b.dataset.price) - Number(a.dataset.price));
    }

    cards.forEach((card) => {
        productGrid.appendChild(card);
    });
}

function updateItemCount(count) {
    const itemCountEl = document.getElementById('itemCount');
    if (itemCountEl) {
        itemCountEl.textContent = `${count} item${count !== 1 ? 's' : ''}`;
    }
}

if (drawerClose) {
    drawerClose.addEventListener('click', closeDrawer);
}

if (cartDrawerOverlay) {
    cartDrawerOverlay.addEventListener('click', (event) => {
        if (event.target === cartDrawerOverlay) {
            closeDrawer();
        }
    });
}

if (cartNoteTextarea) {
    cartNoteTextarea.addEventListener('input', setCartNote);
}

if (summaryButton) {
    summaryButton.addEventListener('click', openDrawer);
}

if (viewCartButton) {
    viewCartButton.addEventListener('click', openDrawer);
}

if (cartIcon) {
    cartIcon.addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });
}

if (checkoutButton) {
    checkoutButton.addEventListener('click', () => {
        window.location.href = 'checkout.html';
    });
}

updateCartCount();
setupAddCartButtons();
setupFilterButtons();
setupFaqAccordion();
setupProductCardModal();
updateCartDrawer();
updateCartSummaryBar();
populateCheckoutPage();
initCheckoutListeners();
hideCartSummaryBarOnCheckout();

// Complete update to handle dynamic breakdown matching your layout specs
function populateCheckoutPage() {
    const cart = loadCart();
    const container = document.getElementById('checkoutCart');
    const subtotalEl = document.getElementById('invoiceSubtotal');
    const deliveryEl = document.getElementById('invoiceDelivery');
    const grandTotalEl = document.getElementById('invoiceGrandTotal');
    
    if (!container) return;

    container.innerHTML = '';
    if (cart.items.length === 0) {
        container.innerHTML = '<p>Your cart is empty.</p>';
        if (subtotalEl) subtotalEl.textContent = "₹0";
        if (deliveryEl) deliveryEl.textContent = formatDeliveryFee(0);
        if (grandTotalEl) grandTotalEl.textContent = "₹0";
        return;
    }

    const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const deliveryFee = getDeliveryFeeForPincode(addressPincodeEl?.value);

    // Fill structural review grid elements
    container.innerHTML = cart.items.map(item => `
        <article class="product-card" style="cursor:default;">
            <div class="product-image">
                <img src="${item.image || productImages[item.name] || ''}" alt="${item.name}">
            </div>
            <div>
                <div class="product-title">${item.name}</div>
                <div class="product-price">${formatPrice(item.price)} x ${item.quantity}</div>
                <p class="product-description">Quantity: ${item.quantity}</p>
            </div>
        </article>
    `).join('');
    
    // Add edit actions for custom hampers on checkout page
    container.querySelectorAll('.product-card').forEach((card, idx) => {
        const item = cart.items[idx];
        if (item && item.isCustom) {
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-custom-btn';
            editBtn.textContent = 'Edit';
            editBtn.style.marginTop = '0.6rem';
            editBtn.addEventListener('click', () => {
                window.location.href = `custom-hamper.html?edit=${encodeURIComponent(item.id)}`;
            });
            card.appendChild(editBtn);
        }
    });

    if (checkoutNote) {
        checkoutNote.value = cart.note || '';
    }

    if (subtotalEl) subtotalEl.textContent = formatPrice(total);
    if (deliveryEl) deliveryEl.textContent = formatDeliveryFee(deliveryFee);
    if (grandTotalEl) grandTotalEl.textContent = formatPrice(total + deliveryFee);
}

// Hook up validation intercept and trigger gateway
document.getElementById('customerDetailsForm')?.addEventListener('submit', function(e) {
    e.preventDefault(); // Prevents empty native form reloads
    
    const cart = loadCart();
    if (cart.items.length === 0) {
        alert("Your cart is empty!");
        return;
    }

    const totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // Gather collected data objects
    const customerData = {
        name: document.getElementById('custName').value,
        email: document.getElementById('custEmail').value,
        whatsapp: document.getElementById('custWhatsApp').value,
        receiverPhone: document.getElementById('receiverPhone').value,
        address: `${document.getElementById('addressHouse').value}, ${document.getElementById('addressSector').value}, ${document.getElementById('addressState').value} - ${document.getElementById('addressPincode').value}`,
        note: document.getElementById('checkoutNote').value
    };

    initiateRazorpayPayment(totalAmount, customerData);
});

function initiateRazorpayPayment(amount, customer) {
    // Razorpay works completely in minor units (Paise). ₹1 = 100 paise.
    const paiseAmount = amount * 100; 

    const options = {
        "key": "YOUR_RAZORPAY_KEY_ID", // Replace this with your test/live key from Razorpay dashboard
        "amount": paiseAmount,
        "currency": "INR",
        "name": "GLAM AURA",
        "description": "Payment for Beautiful Hampers Order",
        "handler": function (response) {
            // Executed immediately upon payment clearance success
            handlePaymentSuccess(response.razorpay_payment_id, customer);
        },
        "prefill": {
            "name": customer.name,
            "email": customer.email,
            "contact": customer.whatsapp
        },
        "theme": {
            "color": "#3b1717" // Matches Glam Aura font theme colors perfectly
        }
    };

    const rzp1 = new Razorpay(options);
    rzp1.open();
}

function handlePaymentSuccess(paymentId, customer) {
    // 1. Clear cart values natively
    localStorage.removeItem('glamAuraCartData');
    
    // 2. Alert/show customer localized confirmation layout text
    document.getElementById('checkout').innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; font-family:'Elms Sans';">
            <h1 style="font-family:'DynaPuff'; color:#8c4b0f; font-size:2.5rem; margin-bottom:1rem;">🎉 Thanks for ordering!</h1>
            <p style="font-size:1.1rem; color:#3b1717; margin-bottom:0.5rem;">Your payment was successful. <b>Payment ID:</b> ${paymentId}</p>
            <p style="color:#555;">An automated confirmation layout message with order updates has been sent out to <b>${customer.email}</b> and your WhatsApp active line: <b>${customer.whatsapp}</b>.</p>
            <button onclick="window.location.href='index.html'" class="cart-action-btn primary" style="margin-top:2rem; width:auto; padding: 1rem 2rem;">Return to Shop</button>
        </div>
    `;

    // 3. Trigger backend dispatch notifications
    sendAutomatedAlerts(customer, paymentId);
}
// APPEND THIS DIRECTLY AT THE VERY END OF YOUR ENTIRE JS FILE:
function sendAutomatedAlerts(customer, paymentId) {
    const webhookURL = "https://your-automation-webhook-url.com/catch"; 

    fetch(webhookURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            paymentId: paymentId,
            customerName: customer.name,
            email: customer.email,
            whatsapp: customer.whatsapp,
            shippingAddress: customer.address,
            notes: customer.note,
            timestamp: new Date().toISOString()
        })
    }).catch(err => console.log("System automation tracking link offline:", err));
}