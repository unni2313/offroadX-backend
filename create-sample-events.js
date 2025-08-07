// create-sample-events.js
require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('./models/Event');

// Connect to MongoDB
mongoose.connect('mongodb+srv://felixsebastian:qwsaqwsa@cluster0.vmkml.mongodb.net/loginApp?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

const sampleEvents = [
  {
    name: "Desert Storm Challenge",
    date: "2025-02-15",
    time: "08:00",
    location: "Mojave Desert, California",
    maxParticipants: 25,
    difficulty: "Hard",
    duration: "2 days",
    description: "An intense desert adventure through challenging terrain. Experience the thrill of navigating sand dunes, rocky outcrops, and extreme weather conditions. This event is designed for experienced off-road enthusiasts looking for the ultimate challenge.",
    participants: 8,
    status: "upcoming"
  },
  {
    name: "Mountain Trail Explorer",
    date: "2025-02-22",
    time: "09:00",
    location: "Rocky Mountains, Colorado",
    maxParticipants: 20,
    difficulty: "Medium",
    duration: "1 day",
    description: "Explore scenic mountain trails with breathtaking views and moderate challenges. Perfect for intermediate drivers who want to experience beautiful landscapes while testing their off-road skills.",
    participants: 12,
    status: "upcoming"
  },
  {
    name: "Forest Adventure Beginner",
    date: "2025-02-28",
    time: "10:00",
    location: "Pacific Northwest Forest, Oregon",
    maxParticipants: 30,
    difficulty: "Easy",
    duration: "4 hours",
    description: "A gentle introduction to off-road driving through beautiful forest trails. Ideal for beginners and families. Learn basic off-road techniques while enjoying nature.",
    participants: 5,
    status: "upcoming"
  },
  {
    name: "Canyon Explorer Challenge",
    date: "2025-01-20",
    time: "07:30",
    location: "Grand Canyon, Arizona",
    maxParticipants: 15,
    difficulty: "Hard",
    duration: "3 days",
    description: "A completed multi-day expedition through canyon country. Participants navigated challenging rock formations and steep descents.",
    participants: 15,
    status: "completed"
  },
  {
    name: "Beach Dunes Rally",
    date: "2025-03-10",
    time: "11:00",
    location: "Outer Banks, North Carolina",
    maxParticipants: 18,
    difficulty: "Medium",
    duration: "6 hours",
    description: "Experience the unique challenge of driving on sand dunes along the beautiful coastline. Learn sand driving techniques and enjoy ocean views.",
    participants: 0,
    status: "upcoming"
  }
];

async function createSampleEvents() {
  try {
    // Clear existing events (optional)
    await Event.deleteMany({});
    console.log('🗑️ Cleared existing events');

    // Create sample events
    const createdEvents = await Event.insertMany(sampleEvents);
    console.log(`✅ Created ${createdEvents.length} sample events:`);
    
    createdEvents.forEach(event => {
      console.log(`   - ${event.name} (${event.difficulty}) - ${event.participants}/${event.maxParticipants} participants`);
    });

    console.log('\n🎉 Sample events created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sample events:', error);
    process.exit(1);
  }
}

createSampleEvents();