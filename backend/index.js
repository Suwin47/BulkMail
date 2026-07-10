const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

app.use(cors());
app.use(express.json());

const mongoURL =
  "mongodb://suvin:Suvin@ac-skzcyny-shard-00-00.ftcdvab.mongodb.net:27017,ac-skzcyny-shard-00-01.ftcdvab.mongodb.net:27017,ac-skzcyny-shard-00-02.ftcdvab.mongodb.net:27017/?ssl=true&replicaSet=atlas-5ctiou-shard-0&authSource=admin&appName=Cluster0";

let isMongoConnected = false;

const emailRecordSchema = new mongoose.Schema({
  subject: String,
  body: String,
  recipients: [String],
  status: String,
  sentAt: {
    type: Date,
    default: Date.now,
  },
});

const EmailRecord = mongoose.model(
  "EmailRecord",
  emailRecordSchema,
  "emailrecords"
);

mongoose
  .connect(mongoURL, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    isMongoConnected = true;
    console.log("Connected to MongoDB");
  })
  .catch((error) => {
    console.log("Error connecting to MongoDB:", error.message);
  });

async function getCredentials() {
  const client = mongoose.connection.client;

  const databases = await client.db().admin().listDatabases();

  for (let i = 0; i < databases.databases.length; i++) {
    const databaseName = databases.databases[i].name;

    if (databaseName === "admin" || databaseName === "local") {
      continue;
    }

    const db = client.db(databaseName);

    const collections = await db.listCollections().toArray();

    for (let j = 0; j < collections.length; j++) {
      const collectionName = collections[j].name;

      const data = await db
        .collection(collectionName)
        .findOne({});

      if (!data) continue;

      const emailUser =
        data.user || data.email || data.username;

      const emailPass =
        data.pass || data.password || data.appPassword;

      if (emailUser && emailPass) {
        return data;
      }
    }
  }

  return null;
}

app.post("/sendemail", async (req, res) => {
  console.log("BODY:", req.body);
  let subject = "";
  let message = "";
  let validEmails = [];

  try {
    subject = req.body.subject || "";
    message = req.body.message || "";

    const emailList = req.body.emailList || [];

    if (!isMongoConnected) {
      return res.json({
        success: false,
        message: "MongoDB not connected",
      });
    }

    validEmails = emailList.filter(
      (email) =>
        typeof email === "string" &&
        email.includes("@")
    );

    if (validEmails.length === 0) {
      return res.json({
        success: false,
        message: "No valid emails found",
      });
    }

    const data = await getCredentials();

    const emailUser =
      data?.user || data?.email || data?.username;

    const emailPass =
      data?.pass || data?.password || data?.appPassword;

    if (!emailUser || !emailPass) {
      return res.json({
        success: false,
        message: "Email credentials missing",
      });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: emailUser,
        pass: emailPass.replace(/\s/g, ""),
      },
      family: 4,
    });

    for (let i = 0; i < validEmails.length; i++) {
      await transporter.sendMail({
        from: emailUser,
        to: validEmails[i],
        subject: subject,
        text: message,
      });

      console.log(
        "Email sent successfully to " +
          validEmails[i]
      );
    }

    await EmailRecord.create({
      subject,
      body: message,
      recipients: validEmails,
      status: "success",
    });

    res.json({
      success: true,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.log(
      "Error sending email:",
      error.message
    );

    if (
      isMongoConnected &&
      validEmails.length > 0
    ) {
      await EmailRecord.create({
        subject,
        body: message,
        recipients: validEmails,
        status: "failed",
      });
    }

    res.json({
      success: false,
      message: "Failed to send email",
    });
  }
});

app.get("/history", async (req, res) => {
  try {
    if (!isMongoConnected) {
      return res.json([]);
    }

    const history = await EmailRecord.find()
      .sort({ sentAt: -1 });

    res.json(history);
  } catch (error) {
    console.log(
      "Error fetching history:",
      error.message
    );

    res.json([]);
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});