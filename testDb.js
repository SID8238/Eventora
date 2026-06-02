const mongoose = require('mongoose');
const Event = require('./server/models/Event');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/eventora');
  const events = await Event.find({});
  console.log(JSON.stringify(events, null, 2));
  process.exit(0);
}

test();
