const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { createUploadSessionHandler } = require('./upload');

admin.initializeApp();

exports.createUploadSession = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 120, memory: '256MB' })
  .https.onRequest(createUploadSessionHandler);
