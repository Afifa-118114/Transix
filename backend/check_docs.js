const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://imafifa:atlas2316@cluster0.24qzuna.mongodb.net/TransixDB?retryWrites=true&w=majority')
  .then(async () => {
    const db = mongoose.connection.db;
    const doc = await db.collection('campusregistrations').findOne({ 'documents.0': { $exists: true } });
    if (doc) {
      console.log(JSON.stringify(doc.documents, null, 2));
    } else {
      console.log("No documents found in any registration.");
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
