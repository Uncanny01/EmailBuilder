import express from "express"
import cors from "cors"
import path from "path"
import fileUpload from "express-fileupload"
import puppeteer from "puppeteer"
import ejs from "ejs"
import dotenv from "dotenv"
import { v2 as cloudinary } from "cloudinary"

const app = express();

const PORT = 8080;

app.set('view engine', 'ejs');
const __dirname = path.dirname(new URL(import.meta.url).pathname);
app.set('views', path.join(__dirname, 'views'));
dotenv.config()

app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "DELETE", "PUT"],
  credentials: true,
}));

app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: "/tmp/"
}));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})


app.get('/getEmailLayout', (req, res) => {
  const defaultData = {
    title: "Welcome to Our Newsletter!",
    content: "We are glad to have you with us. Stay tuned for more updates.",
    imageUrl: "https://images.unsplash.com/photo-1736266738178-2d19dae0816e?q=80&w=3174&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    footer: "Best regards, Your Company Team"
  };
  res.render('emailTemplate1', defaultData);
});

app.post('/renderAndDownloadTemplate', async (req, res) => {
  try {
    const { title, content, footer } = req.body;
    let imageUrl = req.files?.imageUrl;
    let result;
    if(!imageUrl) imageUrl = req.body.defaultUrl;
    else 
    {
      result = await cloudinary.uploader.upload(imageUrl.tempFilePath, {
        folder: 'InternImages',
      });
      imageUrl = result.secure_url;
    }

    const html = await ejs.renderFile(path.join(__dirname, 'views', 'emailTemplate1.ejs'), {
      title,
      content,
      imageUrl,
      footer
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);

    const fileElement = await page.waitForSelector('.email-container');

    const screenshot = await fileElement.screenshot({
      type: 'png'
    });

    await browser.close();

    await cloudinary.uploader.destroy(result.public_id);

    res.send(Buffer.from(screenshot));
  } catch (error) {
    console.error('Error rendering template:', error);
    res.status(500).json({ error: 'Error rendering template' });
  }

})

app.listen(PORT, () => {
  console.log(`Listening to port: ${PORT}`);
})