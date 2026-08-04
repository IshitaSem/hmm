let allOrders = [];
let currentViewingOrderId = null;

// Wait for Firebase API to initialize
document.addEventListener('DOMContentLoaded', () => {
    // We add a small delay to ensure window.firebaseAPI is populated by the module
    setTimeout(() => {
        if (!window.firebaseAPI) {
            alert("Firebase not initialized correctly.");
            return;
        }
        loadOrders();
    }, 500);

    // Event Listeners
    document.getElementById('refreshBtn').addEventListener('click', loadOrders);
    document.getElementById('searchInput').addEventListener('input', renderOrders);
    document.getElementById('statusFilter').addEventListener('change', renderOrders);
    document.getElementById('adminModalClose').addEventListener('click', closeOrderModal);
    
    document.getElementById('orderModalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('orderModalOverlay')) closeOrderModal();
    });

    document.getElementById('updateStatusBtn').addEventListener('click', handleStatusUpdate);
});

async function loadOrders() {
    const loading = document.getElementById('loadingIndicator');
    const tableWrapper = document.getElementById('tableWrapper');
    
    loading.style.display = 'block';
    tableWrapper.style.display = 'none';

    try {
        allOrders = await window.firebaseAPI.getOrders();
        renderOrders();
        loading.style.display = 'none';
        tableWrapper.style.display = 'block';
    } catch (error) {
        loading.innerHTML = `Failed to load orders: ${error.message}`;
    }
}

function renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    tbody.innerHTML = '';

    const filteredOrders = allOrders.filter(order => {
        const matchesSearch = 
            (order.customerDetails?.name || '').toLowerCase().includes(searchTerm) ||
            (order.customerDetails?.email || '').toLowerCase().includes(searchTerm) ||
            order.id.toLowerCase().includes(searchTerm);
            
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        return matchesSearch && matchesStatus;
    });

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No orders found.</td></tr>';
        return;
    }

    filteredOrders.forEach(order => {
        let dateStr = 'Unknown';
        if (order.timestamp && order.timestamp.toDate) {
            dateStr = order.timestamp.toDate().toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short'
            });
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${dateStr}</td>
            <td>
                <strong>${escapeHtml(order.customerDetails?.name || 'N/A')}</strong><br>
                <small>${escapeHtml(order.customerDetails?.email || 'N/A')}</small>
            </td>
            <td>₹${order.orderSummary?.grandTotal || 0}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>
                <button class="action-btn" title="View Details" onclick="viewOrder('${order.id}')">
                    <span class="material-symbols-outlined">visibility</span>
                </button>
                <button class="action-btn delete" title="Delete Order" onclick="deleteOrder('${order.id}')">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function viewOrder(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    currentViewingOrderId = orderId;
    const body = document.getElementById('orderModalBody');
    const cust = order.customerDetails || {};
    const sum = order.orderSummary || {};
    const cart = order.cart || [];
    const custom = order.customHamper || [];

    // Set dropdown to current status
    document.getElementById('updateStatusSelect').value = order.status;

    let cartHtml = cart.map(item => `
        <div class="detail-row">
            <span>${escapeHtml(item.name)} (x${item.quantity})</span>
            <span>₹${item.price * item.quantity}</span>
        </div>
    `).join('');

    let customHtml = custom.map(item => `
        <div class="detail-row" style="flex-direction: column; margin-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 0.5rem;">
            <div style="display: flex; justify-content: space-between;">
                <strong>${escapeHtml(item.name)} (x${item.quantity})</strong>
                <strong>₹${item.price * item.quantity}</strong>
            </div>
            <div style="font-size: 0.85rem; color: #666; margin-top: 0.3rem;">
                Items: ${escapeHtml(item.items || 'None')}
            </div>
        </div>
    `).join('');

    body.innerHTML = `
        <div style="margin-bottom: 1.5rem;">
            <h3 style="font-family: 'DynaPuff'; color: #8c4b0f; margin-bottom: 0.2rem;">Order #${order.id}</h3>
            <div style="color: #666; font-size: 0.9rem;">Status: <strong>${order.status}</strong></div>
        </div>

        <div class="detail-section">
            <h4>Customer Info</h4>
            <div class="detail-row"><span>Name:</span> <strong>${escapeHtml(cust.name)}</strong></div>
            <div class="detail-row"><span>Email:</span> <strong>${escapeHtml(cust.email)}</strong></div>
            <div class="detail-row"><span>Phone:</span> <strong>${escapeHtml(cust.whatsapp)}</strong></div>
            <div class="detail-row"><span>Receiver Phone:</span> <strong>${escapeHtml(cust.receiverPhone)}</strong></div>
            <div class="detail-row"><span>Address:</span> <span>${escapeHtml(cust.house)}, ${escapeHtml(cust.street)}, ${escapeHtml(cust.city)}, ${escapeHtml(cust.state)} - ${escapeHtml(cust.pincode)}</span></div>
            ${cust.landmark ? `<div class="detail-row"><span>Landmark:</span> <span>${escapeHtml(cust.landmark)}</span></div>` : ''}
        </div>

        <div class="detail-section">
            <h4>Order Details</h4>
            <div class="detail-row"><span>Occasion:</span> <span>${escapeHtml(cust.occasion || 'N/A')}</span></div>
            <div class="detail-row"><span>Recipient Name:</span> <span>${escapeHtml(cust.recipientName || 'N/A')}</span></div>
            <div class="detail-row"><span>Delivery Date:</span> <span>${escapeHtml(cust.deliveryDate || 'N/A')}</span></div>
            <div class="detail-row"><span>Delivery Time:</span> <span>${escapeHtml(cust.deliveryTime || 'N/A')}</span></div>
            <div class="detail-row"><span>Gift Message:</span> <span>${escapeHtml(cust.giftMessage || 'N/A')}</span></div>
            <div class="detail-row"><span>Special Requests:</span> <span>${escapeHtml(cust.specialRequests || 'N/A')}</span></div>
            <div class="detail-row"><span>Order Note:</span> <span>${escapeHtml(cust.note || 'N/A')}</span></div>
        </div>

        ${cart.length > 0 ? `
        <div class="detail-section">
            <h4>Standard Cart</h4>
            ${cartHtml}
        </div>` : ''}

        ${custom.length > 0 ? `
        <div class="detail-section">
            <h4>Custom Hampers</h4>
            ${customHtml}
        </div>` : ''}

        <div class="detail-section" style="background-color: #fff; border: 2px solid #f8dc8e;">
            <h4>Payment Summary</h4>
            <div class="detail-row"><span>Items Total:</span> <span>₹${sum.itemsTotal || 0}</span></div>
            <div class="detail-row"><span>Delivery Fee:</span> <span>₹${sum.deliveryCharge || 0}</span></div>
            <div class="detail-row" style="border-top: 1px solid #ccc; padding-top: 0.5rem; margin-top: 0.5rem; font-weight: bold; font-size: 1.1rem; color: #8c4b0f;">
                <span>Grand Total:</span> <span>₹${sum.grandTotal || 0}</span>
            </div>
            <div class="detail-row" style="margin-top: 0.5rem;"><span>Payment Method:</span> <span>${escapeHtml(sum.paymentMethod || 'N/A')}</span></div>
        </div>
    `;

    document.getElementById('orderModalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeOrderModal() {
    document.getElementById('orderModalOverlay').classList.remove('active');
    document.body.style.overflow = '';
    currentViewingOrderId = null;
}

async function handleStatusUpdate() {
    if (!currentViewingOrderId) return;
    const newStatus = document.getElementById('updateStatusSelect').value;
    const btn = document.getElementById('updateStatusBtn');
    const originalText = btn.innerHTML;

    try {
        btn.innerHTML = 'Updating...';
        btn.disabled = true;
        await window.firebaseAPI.updateOrderStatus(currentViewingOrderId, newStatus);
        
        // Update local state
        const orderIndex = allOrders.findIndex(o => o.id === currentViewingOrderId);
        if (orderIndex > -1) {
            allOrders[orderIndex].status = newStatus;
        }
        
        renderOrders();
        alert('Order status updated successfully!');
        closeOrderModal();
    } catch (error) {
        alert('Failed to update status: ' + error.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
        return;
    }
    
    try {
        await window.firebaseAPI.deleteOrder(orderId);
        allOrders = allOrders.filter(o => o.id !== orderId);
        renderOrders();
        alert('Order deleted successfully.');
    } catch (error) {
        alert('Failed to delete order: ' + error.message);
    }
}

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
