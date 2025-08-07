// test-event-participation.js
require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  email: 'user@offroadx.com',
  password: 'user123'
};

let authToken = '';
let testEventId = '';

async function testEventParticipation() {
  try {
    console.log('🧪 Testing Event Participation System\n');

    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in test user...');
    const loginResponse = await axios.post(`${BASE_URL}/login`, TEST_USER);
    
    if (loginResponse.data.token) {
      authToken = loginResponse.data.token;
      console.log('✅ Login successful');
      console.log(`   User: ${loginResponse.data.user.firstName} ${loginResponse.data.user.secondName}`);
      console.log(`   Role: ${loginResponse.data.user.role}\n`);
    } else {
      throw new Error('Login failed - no token received');
    }

    // Step 2: Get all events
    console.log('2️⃣ Fetching all events...');
    const eventsResponse = await axios.get(`${BASE_URL}/events`);
    const events = eventsResponse.data.events;
    
    console.log(`✅ Found ${events.length} events:`);
    events.forEach((event, index) => {
      console.log(`   ${index + 1}. ${event.name} (${event.difficulty}) - ${event.participants}/${event.maxParticipants} participants - ${event.status}`);
    });
    
    // Find an upcoming event that's not full
    const availableEvent = events.find(event => 
      event.status === 'upcoming' && event.participants < event.maxParticipants
    );
    
    if (!availableEvent) {
      throw new Error('No available events to join');
    }
    
    testEventId = availableEvent._id;
    console.log(`\n   Selected event for testing: ${availableEvent.name}\n`);

    // Step 3: Get user's current participations
    console.log('3️⃣ Checking user\'s current participations...');
    const participationsResponse = await axios.get(`${BASE_URL}/events/user/participations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const currentParticipations = participationsResponse.data.participations;
    console.log(`✅ User is currently registered for ${currentParticipations.length} events`);
    
    if (currentParticipations.length > 0) {
      console.log('   Current participations:');
      participationsResponse.data.events.forEach(event => {
        console.log(`   - ${event.name}`);
      });
    }
    console.log('');

    // Step 4: Join the selected event
    console.log('4️⃣ Joining the selected event...');
    const joinResponse = await axios.post(`${BASE_URL}/events/${testEventId}/join`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Successfully joined the event!');
    console.log(`   Event: ${joinResponse.data.event.name}`);
    console.log(`   New participant count: ${joinResponse.data.event.participants}/${joinResponse.data.event.maxParticipants}\n`);

    // Step 5: Verify participation was recorded
    console.log('5️⃣ Verifying participation was recorded...');
    const updatedParticipationsResponse = await axios.get(`${BASE_URL}/events/user/participations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const updatedParticipations = updatedParticipationsResponse.data.participations;
    console.log(`✅ User is now registered for ${updatedParticipations.length} events`);
    
    if (updatedParticipations.includes(testEventId)) {
      console.log('✅ Event participation confirmed in user record\n');
    } else {
      throw new Error('Event participation not found in user record');
    }

    // Step 6: Try to join the same event again (should fail)
    console.log('6️⃣ Testing duplicate join prevention...');
    try {
      await axios.post(`${BASE_URL}/events/${testEventId}/join`, {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      throw new Error('Duplicate join should have failed');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Duplicate join correctly prevented');
        console.log(`   Error: ${error.response.data.error}\n`);
      } else {
        throw error;
      }
    }

    // Step 7: Leave the event
    console.log('7️⃣ Leaving the event...');
    const leaveResponse = await axios.post(`${BASE_URL}/events/${testEventId}/leave`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Successfully left the event!');
    console.log(`   Event: ${leaveResponse.data.event.name}`);
    console.log(`   New participant count: ${leaveResponse.data.event.participants}/${leaveResponse.data.event.maxParticipants}\n`);

    // Step 8: Verify participation was removed
    console.log('8️⃣ Verifying participation was removed...');
    const finalParticipationsResponse = await axios.get(`${BASE_URL}/events/user/participations`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const finalParticipations = finalParticipationsResponse.data.participations;
    console.log(`✅ User is now registered for ${finalParticipations.length} events`);
    
    if (!finalParticipations.includes(testEventId)) {
      console.log('✅ Event participation successfully removed from user record\n');
    } else {
      throw new Error('Event participation still found in user record');
    }

    console.log('🎉 All tests passed! Event participation system is working correctly.\n');
    
    // Summary
    console.log('📋 Test Summary:');
    console.log('✅ User authentication');
    console.log('✅ Event listing');
    console.log('✅ User participation tracking');
    console.log('✅ Event joining');
    console.log('✅ Duplicate join prevention');
    console.log('✅ Event leaving');
    console.log('✅ Participation cleanup');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testEventParticipation();