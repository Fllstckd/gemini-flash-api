// Load environment variables from .env file
require('dotenv').config();

// Import necessary modules
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');

// Configure Express app
const app = express();
const port = 3000;

// Set up Google Gemini AI with API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Middleware
app.use(cors());
app.use(express.json());
// Serve static files from the 'public' directory
app.use(express.static('public'));

// Safety settings for Gemini API
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

// Helper function to convert file to Generative Part
function fileToGenerativePart(filePath, mimeType) {
  try {
    const fileData = fs.readFileSync(filePath);
    return {
      inlineData: {
        data: Buffer.from(fileData).toString("base64"),
        mimeType
      },
    };
  } catch (error) {
    console.error(`Error reading file at ${filePath}:`, error);
    return null;
  }
}

// Endpoint for text-based prompts
app.post('/generate-text', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    res.json({ result: text });
  } catch (error) {
    console.error('Error generating text:', error);
    res.status(500).json({ error: 'Failed to generate text' });
  }
});

// Endpoint for image-based prompts
app.post('/generate-from-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded.' });
  }

  const imagePart = fileToGenerativePart(req.file.path, req.file.mimetype);
  if (!imagePart) {
    fs.unlinkSync(req.file.path); // Clean up file
    return res.status(500).json({ error: 'Failed to process image file.' });
  }

  try {
    const result = await model.generateContent([req.body.prompt || 'Describe this image.', imagePart]);
    const response = await result.response;
    const text = response.text();
    res.json({ result: text });
  } catch (error) {
    console.error('Error generating from image:', error);
    res.status(500).json({ error: 'Failed to process image and prompt.' });
  } finally {
    fs.unlinkSync(req.file.path); // Clean up file
  }
});

// Endpoint for document-based prompts
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No document file uploaded.' });
  }

  const documentPart = fileToGenerativePart(req.file.path, req.file.mimetype);
  if (!documentPart) {
    fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: 'Failed to process document file.' });
  }

  try {
    const result = await model.generateContent([req.body.prompt || 'Summarize this document.', documentPart]);
    const response = await result.response;
    const text = response.text();
    res.json({ result: text });
  } catch (error) {
    console.error('Error generating from document:', error);
    res.status(500).json({ error: 'Failed to process document and prompt.' });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// Endpoint for audio-based prompts
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded.' });
  }

  const audioPart = fileToGenerativePart(req.file.path, req.file.mimetype);
  if (!audioPart) {
    fs.unlinkSync(req.file.path);
    return res.status(500).json({ error: 'Failed to process audio file.' });
  }

  try {
    const result = await model.generateContent([req.body.prompt || 'Transcribe this audio.', audioPart]);
    const response = await result.response;
    const text = response.text();
    res.json({ result: text });
  } catch (error) {
    console.error('Error generating from audio:', error);
    res.status(500).json({ error: 'Failed to process audio and prompt.' });
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
  console.log('API Endpoints:');
  console.log(`- POST /generate-text`);
  console.log(`- POST /generate-from-image`);
  console.log(`- POST /generate-from-document`);
  console.log(`- POST /generate-from-audio`);
});