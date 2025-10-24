import { S3Client,GetObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import path from "path";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import dotenv from "dotenv";
dotenv.config();

const REGION = process.env.AWS_REGION;
const BUCKET = process.env.S3_BUCKET;

if (!REGION || !BUCKET) {
  throw new Error("Missing required AWS environment variables");
}

const s3Client = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadBufferToS3(buffer, filename, contentType, folder = "books") {
  const timestamp = Date.now();
  const ext = path.extname(filename);
  const safeName = `${folder}/${timestamp}-${Math.random().toString(36).slice(2,8)}${ext}`;

  const upload = new Upload({
    client: s3Client,
    params: {
      Bucket: BUCKET,
      Key: safeName,
      Body: buffer,
      ContentType: contentType,
    },
  });

  await upload.done();

  const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${encodeURIComponent(safeName)}`;

  return {
    key: safeName,
    url,
    fileName: filename,
    size: buffer.length,
    mimeType: contentType,
    uploadedAt: new Date(),
  };
}




export async function generateSignedDownloadUrl(key, expiresIn = 60) {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
}