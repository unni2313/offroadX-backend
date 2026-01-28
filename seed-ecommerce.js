const mongoose = require('mongoose');
const Product = require('./models/Product');
const Order = require('./models/Order');
require('dotenv').config();

const MONGODB_URI = 'mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Cluster0';

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        await Product.deleteMany({});
        await Order.deleteMany({});
        console.log('Cleared existing data');

        const sampleProducts = [
            { name: 'Offroad Tires X1', description: 'Heavy duty all-terrain tires.', price: 299.99, category: 'Accessories', stock: 15 },
            { name: 'Adventure Tent 4P', description: 'Spacious 4-person camping tent.', price: 450.00, category: 'Camping', stock: 8 },
            { name: 'Recovery Rope 10m', description: 'High-strength snatch strap.', price: 89.99, category: 'Safety', stock: 25 },
            { name: 'Roof Rack Pro', description: 'Rugged roof storage system.', price: 599.00, category: 'Exterior', stock: 0 }
        ];

        const createdProducts = await Product.insertMany(sampleProducts);
        console.log('Added sample products');

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
        console.log('Added sample orders');

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seed();
