const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');

// Get all products
router.get('/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a product
router.post('/products', async (req, res) => {
    const product = new Product({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        image: req.body.image,
        stock: req.body.stock
    });

    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Update a product
router.put('/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });

        if (req.body.name) product.name = req.body.name;
        if (req.body.description) product.description = req.body.description;
        if (req.body.price) product.price = req.body.price;
        if (req.body.category) product.category = req.body.category;
        if (req.body.image) product.image = req.body.image;
        if (req.body.stock !== undefined) product.stock = req.body.stock;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a product
router.delete('/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ message: 'Product deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get all orders
router.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ date: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Seed sample data
router.post('/seed', async (req, res) => {
    try {
        // Clear existing
        await Product.deleteMany({});
        await Order.deleteMany({});

        // Sample Products
        const sampleProducts = [
            { name: 'Offroad Tires X1', description: 'Heavy duty all-terrain tires.', price: 299.99, category: 'Accessories', stock: 15 },
            { name: 'Adventure Tent 4P', description: 'Spacious 4-person camping tent.', price: 450.00, category: 'Camping', stock: 8 },
            { name: 'Recovery Rope 10m', description: 'High-strength snatch strap.', price: 89.99, category: 'Safety', stock: 25 },
            { name: 'Roof Rack Pro', description: 'Rugged roof storage system.', price: 599.00, category: 'Exterior', stock: 0 }
        ];

        const createdProducts = await Product.insertMany(sampleProducts);

        // Sample Orders
        const sampleOrders = [
            {
                orderId: '#ORD-' + Math.floor(1000 + Math.random() * 9000),
                customerName: 'John Doe',
                customerEmail: 'john@example.com',
                items: [{ product: createdProducts[0]._id, name: createdProducts[0].name, quantity: 1, price: 299.99 }],
                totalAmount: 299.99,
                status: 'Delivered'
            },
            {
                orderId: '#ORD-' + Math.floor(1000 + Math.random() * 9000),
                customerName: 'Sarah Smith',
                customerEmail: 'sarah@example.com',
                items: [{ product: createdProducts[1]._id, name: createdProducts[1].name, quantity: 1, price: 450.00 }],
                totalAmount: 450.00,
                status: 'Processing'
            }
        ];

        await Order.insertMany(sampleOrders);

        res.json({ message: 'Sample data seeded successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
