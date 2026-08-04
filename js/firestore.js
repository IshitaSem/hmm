import { db } from './firebase.js';
import { 
    collection, 
    addDoc, 
    setDoc,
    getDocs, 
    getDoc, 
    doc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const ORDERS_COLLECTION = 'orders';

/**
 * Generate a new order ID without saving
 * @returns {string} A new order ID
 */
export const generateOrderId = () => {
    return doc(collection(db, ORDERS_COLLECTION)).id;
};

/**
 * Save a new order to Firestore
 * @param {Object} orderData - The complete order details
 * @param {string} [orderId] - Optional pre-generated order ID
 * @returns {Promise<string>} The ID of the saved order document
 */
export const saveOrder = async (orderData, orderId) => {
    try {
        const orderPayload = {
            ...orderData,
            status: orderData.status || 'Pending',
            timestamp: serverTimestamp()
        };
        
        if (orderId) {
            await setDoc(doc(db, ORDERS_COLLECTION, orderId), orderPayload);
            return orderId;
        } else {
            const docRef = await addDoc(collection(db, ORDERS_COLLECTION), orderPayload);
            return docRef.id;
        }
    } catch (error) {
        console.error("Error adding order: ", error);
        throw error;
    }
};

/**
 * Retrieve all orders from Firestore, ordered by timestamp descending
 * @returns {Promise<Array>} Array of order objects
 */
export const getOrders = async () => {
    try {
        const q = query(collection(db, ORDERS_COLLECTION), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);
        const orders = [];
        querySnapshot.forEach((doc) => {
            orders.push({ id: doc.id, ...doc.data() });
        });
        return orders;
    } catch (error) {
        console.error("Error getting orders: ", error);
        throw error;
    }
};

/**
 * Retrieve a single order by its ID
 * @param {string} orderId 
 * @returns {Promise<Object|null>} The order object or null if not found
 */
export const getOrderById = async (orderId) => {
    try {
        const docRef = doc(db, ORDERS_COLLECTION, orderId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error getting order: ", error);
        throw error;
    }
};

/**
 * Update the status of an existing order
 * @param {string} orderId 
 * @param {string} newStatus 
 * @returns {Promise<void>}
 */
export const updateOrderStatus = async (orderId, newStatus) => {
    try {
        const docRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(docRef, { status: newStatus });
    } catch (error) {
        console.error("Error updating order status: ", error);
        throw error;
    }
};

/**
 * Delete an order from Firestore
 * @param {string} orderId 
 * @returns {Promise<void>}
 */
export const deleteOrder = async (orderId) => {
    try {
        const docRef = doc(db, ORDERS_COLLECTION, orderId);
        await deleteDoc(docRef);
    } catch (error) {
        console.error("Error deleting order: ", error);
        throw error;
    }
};

/**
 * Verify a payment (updates status and adds timestamp)
 * @param {string} orderId 
 */
export const verifyPayment = async (orderId) => {
    try {
        const docRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(docRef, { 
            paymentStatus: 'Verified',
            status: 'Processing',
            paymentVerifiedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error verifying payment: ", error);
        throw error;
    }
};

/**
 * Reject a payment
 * @param {string} orderId 
 */
export const rejectPayment = async (orderId) => {
    try {
        const docRef = doc(db, ORDERS_COLLECTION, orderId);
        await updateDoc(docRef, { 
            paymentStatus: 'Rejected' 
        });
    } catch (error) {
        console.error("Error rejecting payment: ", error);
        throw error;
    }
};

// Expose functions globally so they can be accessed by non-module scripts (like script.js)
window.firebaseAPI = {
    generateOrderId,
    saveOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    deleteOrder,
    verifyPayment,
    rejectPayment
};
