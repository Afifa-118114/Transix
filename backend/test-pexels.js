const axios = require('axios');
require('dotenv').config();
const { PexelsSearch } = require('./src/services/imageEngineService');

(async () => {
  const res = await PexelsSearch.search({destination: "kerala"}, "Sightseeing");
  console.log('Pexels result:', res);
})();
