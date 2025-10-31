const { app } = require('@azure/functions');
const adminSummary = require('./functions/AdminProgress');

// Configure the app
app.setup({
    enableHttpStream: true,
});

// Register the function
app.http('adminSummary', {
    methods: ['GET', 'OPTIONS'],
    authLevel: 'anonymous',
    handler: adminSummary
});

// Export the app
module.exports = app;
