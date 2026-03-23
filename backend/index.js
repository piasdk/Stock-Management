"use strict";

const app = require("./src/app");
const { API_PORT } = require("./src/config/constants");

const PORT = API_PORT || 5000;

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
