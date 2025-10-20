// Script to create a test route with coordinates for Google Maps testing
const mongoose = require('mongoose');
const Route = require('./models/Route');
const User = require('./models/User');

async function createTestRouteWithCoordinates() {
  try {
    console.log('🗺️ Creating test route with coordinates for Google Maps...\n');
    
    // Connect to MongoDB
    await mongoose.connect('mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB');
    
    // Find admin user
    const adminUser = await User.findOne({ role: 'admin' });
    if (!adminUser) {
      console.log('❌ No admin user found');
      return;
    }
    
    // Create a test route with real coordinates (Vagamon to Munnar route in Kerala)
    const testRoute = new Route({
      name: 'Vagamon to Munnar Scenic Trail',
      description: 'A breathtaking mountain trail connecting two beautiful hill stations in Kerala. Experience lush tea gardens, misty mountains, and winding roads through the Western Ghats.',
      difficulty: 'Intermediate',
      distance: 45.2,
      estimatedTime: '2-3 hours',
      terrain: 'Mountain',
      startLocation: 'Vagamon Hill Station, Kerala',
      startCoordinates: { 
        lat: 9.7707459, 
        lng: 76.7380445 
      },
      endLocation: 'Munnar Tea Gardens, Kerala',
      endCoordinates: { 
        lat: 10.0889, 
        lng: 77.0595 
      },
      waypoints: [],
      safetyNotes: 'Mountain roads can be narrow and winding. Check weather conditions before departure. Carry warm clothing as temperatures can drop significantly.',
      requiredVehicleType: 'SUV',
      maxParticipants: 12,
      createdBy: adminUser._id,
      isActive: true
    });
    
    await testRoute.save();
    console.log('✅ Test route created successfully!');
    
    console.log('\n📋 Route Details:');
    console.log('Name:', testRoute.name);
    console.log('Start:', testRoute.startLocation);
    console.log('Start Coordinates:', `${testRoute.startCoordinates.lat}, ${testRoute.startCoordinates.lng}`);
    console.log('End:', testRoute.endLocation);
    console.log('End Coordinates:', `${testRoute.endCoordinates.lat}, ${testRoute.endCoordinates.lng}`);
    
    // Generate the Google Maps URL
    const startLatLng = `${testRoute.startCoordinates.lat},${testRoute.startCoordinates.lng}`;
    const endLatLng = `${testRoute.endCoordinates.lat},${testRoute.endCoordinates.lng}`;
    const centerLat = (testRoute.startCoordinates.lat + testRoute.endCoordinates.lat) / 2;
    const centerLng = (testRoute.startCoordinates.lng + testRoute.endCoordinates.lng) / 2;
    const mapUrl = `https://www.google.com/maps/dir/${startLatLng}/${endLatLng}/@${centerLat},${centerLng},10z?hl=en-US&entry=ttu`;
    
    console.log('\n🗺️ Google Maps URL:');
    console.log(mapUrl);
    
    console.log('\n🎉 Test route with coordinates created successfully!');
    console.log('Now you can:');
    console.log('1. Go to the Trail Routes admin page');
    console.log('2. View the route card - you should see a "View Route on Google Maps" link');
    console.log('3. Click "View" to see the route in the modal with embedded map');
    console.log('4. Edit the route to see the route preview in the form');
    
  } catch (error) {
    console.error('❌ Error creating test route:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createTestRouteWithCoordinates();