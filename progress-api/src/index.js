const { app } = require('@azure/functions');

// Configure the app
app.setup({
    enableHttpStream: true,
});

// Import all functions
require('./functions/adminSummary');

// Export the app
module.exports = app;
