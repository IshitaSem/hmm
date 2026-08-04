/**
 * Calculate India Post shipping based on total weight in grams
 * @param {number} weightInGrams 
 * @returns {number} Shipping cost in ₹
 */
function calculateShipping(weightInGrams) {
    if (weightInGrams <= 250) {
        return 80;
    } else if (weightInGrams <= 500) {
        return 120;
    } else if (weightInGrams <= 1000) {
        return 160;
    } else if (weightInGrams <= 1500) {
        return 220;
    } else {
        return 299; // 1501g+
    }
}

// Expose globally so it can be used across modules/scripts
window.shippingAPI = {
    calculateShipping
};
