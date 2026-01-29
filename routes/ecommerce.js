const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Order = require('../models/Order');
const verifyToken = require('../utils/verify-token');
const multer = require('multer');
const path = require('path');
const cloudinary = require('../utils/cloudinary');

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|webp/;
        const ext = path.extname(file.originalname).toLowerCase();
        const mime = file.mimetype.toLowerCase();
        if (allowed.test(ext) && allowed.test(mime)) cb(null, true);
        else cb(new Error('Only JPG, PNG, WEBP images are allowed'));
    },
});

// Upload image to Cloudinary
router.post('/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'offroadx/products',
                    resource_type: 'image',
                    transformation: [
                        { width: 800, height: 800, crop: 'limit' },
                        { quality: 'auto', fetch_format: 'auto' }
                    ]
                },
                (err, result) => (err ? reject(err) : resolve(result))
            );
            stream.end(req.file.buffer);
        });

        res.json({ url: uploadResult.secure_url });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});

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

// Get orders for authenticated user
router.get('/orders/user', verifyToken, async (req, res) => {
    try {
        const orderUserId = req.user?.id || req.user?._id || req.user?.userId;
        const orders = await Order.find({ userId: orderUserId })
            .populate('items.product')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Create a new order (checkout)
router.post('/orders', verifyToken, async (req, res) => {
    console.log('--- Order Creation Debug ---');
    console.log('req.user:', req.user);
    console.log('req.body:', req.body);
    try {
        const { items, shippingAddress, customerName, customerEmail } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No items in order' });
        }

        // Calculate total and validate stock
        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(404).json({ message: `Product not found: ${item.productId}` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
            }

            // Reduce stock
            product.stock -= item.quantity;
            await product.save();

            orderItems.push({
                product: product._id,
                name: product.name,
                quantity: item.quantity,
                price: product.price
            });

            totalAmount += product.price * item.quantity;
        }

        const orderUserId = req.user?.id || req.user?._id || req.user?.userId;

        console.log('Final Order Data Prep:', {
            orderUserId,
            customerName,
            customerEmail,
            itemCount: orderItems.length,
            totalTotal: totalAmount
        });

        if (!orderUserId) {
            return res.status(401).json({ message: 'User identification failed. Please re-login.' });
        }

        const order = new Order({
            orderId: '#ORD-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            userId: new mongoose.Types.ObjectId(orderUserId),
            customerName: customerName || (req.user?.firstName ? `${req.user.firstName} ${req.user.secondName || ''}`.trim() : 'Customer'),
            customerEmail: customerEmail || req.user?.email || 'no-email@example.com',
            shippingAddress: shippingAddress || 'No Address Provided',
            items: orderItems,
            totalAmount,
            status: 'Processing'
        });

        const savedOrder = await order.save();
        console.log('Order saved successfully:', savedOrder.orderId);
        res.status(201).json(savedOrder);
    } catch (err) {
        console.error('CRITICAL Order Creation Error:', err);
        res.status(500).json({
            message: 'Order creation failed',
            error: err.message,
            validationErrors: err.errors ? Object.keys(err.errors) : null
        });
    }
});

// Get all orders (admin)
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
