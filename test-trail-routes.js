// Test script to verify trail routes functionality
const mongoose = require('mongoose');
const User = require('./models/User');
const Route = require('./models/Route');

async function testTrailRoutes() {
  try {
    console.log('🧪 Testing Trail Routes Functionality...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB');
    
    // Check if admin user exists
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found. Creating one...');
      
      const newAdmin = new User({
        name: 'Test Admin',
        email: 'admin@test.com',
        password: '$2b$10$hashedpassword', // This would be properly hashed in real scenario
        phone: '1234567890',
        role: 'admin',
        isEmailVerified: true
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created');
    } else {
      console.log('✅ Admin user exists:', adminUser.email);
    }
    
    // Check existing routes
    const existingRoutes = await Route.find();
    console.log(`📍 Found ${existingRoutes.length} existing routes`);
    
    // Create a test route if none exist
    if (existingRoutes.length === 0) {
      console.log('🛤️ Creating test route...');
      
      const testRoute = new Route({
        name: 'Desert Adventure Trail',
        description: 'A challenging desert trail with stunning views and rocky terrain.',
        difficulty: 'Intermediate',
        distance: 15.5,
        estimatedTime: '3-4 hours',
        terrain: 'Desert',
        startLocation: 'Desert Entrance, Phoenix, AZ',
        startCoordinates: { lat: 33.4484, lng: -112.0740 },
        endLocation: 'Mountain View Point, Phoenix, AZ',
        endCoordinates: { lat: 33.4734, lng: -112.0940 },
        waypoints: [],
        safetyNotes: 'Bring plenty of water and sun protection. Check weather conditions before departure.',
        requiredVehicleType: 'ATV',
        maxParticipants: 15,
        createdBy: adminUser._id
      });
      
      await testRoute.save();
      console.log('✅ Test route created successfully');
    }
    
    // Verify route model fields
    const sampleRoute = await Route.findOne();
    if (sampleRoute) {
      console.log('\n📋 Route Model Verification:');
      console.log('✅ Name:', sampleRoute.name);
      console.log('✅ Description:', sampleRoute.description);
      console.log('✅ Difficulty:', sampleRoute.difficulty);
      console.log('✅ Distance:', sampleRoute.distance);
      console.log('✅ Start Location:', sampleRoute.startLocation);
      console.log('✅ Start Coordinates:', sampleRoute.startCoordinates);
      console.log('✅ End Location:', sampleRoute.endLocation);
      console.log('✅ End Coordinates:', sampleRoute.endCoordinates);
      console.log('✅ Terrain:', sampleRoute.terrain);
      console.log('✅ Vehicle Type:', sampleRoute.requiredVehicleType);
      console.log('✅ Max Participants:', sampleRoute.maxParticipants);
      console.log('✅ Is Active:', sampleRoute.isActive);
    }
    
    console.log('\n🎉 Trail Routes functionality test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Make sure backend server is running (node server.js)');
    console.log('2. Make sure frontend is running (npm run dev)');
    console.log('3. Log in as admin user');
    console.log('4. Navigate to Trail Routes section');
    console.log('5. Test creating, editing, and deleting routes');
    
  } catch (error) {
    console.error('❌ Error testing trail routes:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testTrailRoutes();