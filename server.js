// server.js
// where your node app starts

// init project
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();

// we've started you off with Express,
// but feel free to use whatever libs or frameworks you'd like through `package.json`.
// Set up file storage using Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const clientId = req.query.clientId || "unknown";
    if (clientId != `unknown`) {
      const uploadPath = `uploads/${clientId}/`;
      // Create the subfolder if it doesn't exist
      fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath); // Specify the directory where files will be stored
    } else {
      cb(null, "uploads/"); // Specify the directory where files will be stored
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Use a unique filename
  },
});

const upload = multer({ storage, limits: {
    fileSize: 1024 * 1024, // 1MB per file
    files: 10,             // Maximum of 10 files
  },});

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

app.use("/uploads", express.static(path.join(__dirname, "/uploads")));

app.post("/upload", (req, res, next) => {
  upload.array("files") (req, res, (err)=>{
    if (err instanceof multer.MulterError) {
      // A Multer error occurred (e.g., file size exceeded)
      return res.status(400).send('File size limit exceeded');
    } else if (err) {
      // An unknown error occurred
      return res.status(500).send('Internal server error');
    }
    
    const clientId = req.query.clientId || "unknown";
    const uploadedImages = req.files.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      uploadDate: new Date(),
    }));

    // Store uploaded image records in a client-specific JSON file
    const clientRecordPath = path.join(
      __dirname,
      "/client_records",
      `${clientId}.json`
    );
    // Create the subfolder if it doesn't exist
    fs.mkdirSync(path.join(__dirname,"/client_records"), { recursive: true });
    fs.writeFileSync(clientRecordPath, JSON.stringify(uploadedImages, null, 2));

    // res.send(req.body);
    res.status(200).send(`Images uploaded successfully.`);
  });
});

// API endpoint to get the image records for a specific client
app.get("/images/:clientId/records", (req, res) => {
  const clientId = req.params.clientId;
  const clientRecordPath = path.join(
    __dirname,
    "/client_records",
    `${clientId}.json`
  );
  if (fs.existsSync(clientRecordPath)) {
    const imageRecords = JSON.parse(fs.readFileSync(clientRecordPath));
    res.json(imageRecords);
  } else {
    res.status(404).send("Image records not found.");
  }
});

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + "/views/index.html");
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function () {
  console.log("Your app is listening on port " + listener.address().port);
});