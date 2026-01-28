const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String },
    image: { type: String },
    stock: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['In Stock', 'Low Stock', 'Out of Stock'],
        default: 'In Stock'
    }
}, { timestamps: true });

// Middleware to update status based on stock
productSchema.pre('save', function (next) {
    if (this.stock <= 0) {
        this.status = 'Out of Stock';
    } else if (this.stock < 10) {
        this.status = 'Low Stock';
    } else {
        this.status = 'In Stock';
    }
    next();
});

module.exports = mongoose.model('Product', productSchema);
