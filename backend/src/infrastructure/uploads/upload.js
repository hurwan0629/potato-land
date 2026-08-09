import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import multer from "multer";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";

const backendRoot = fileURLToPath(new URL("../../../", import.meta.url));
const MIME_EXTENSIONS = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
});

export function getUploadRootDirectory() {
  return path.resolve(backendRoot, env.uploads.baseDir);
}

export function toUploadResourceUrl(directoryName, filename) {
  return `/resources/${directoryName}/${filename}`;
}

function createImageUpload({ directoryName, fieldName, maxFiles, filePrefix }) {
  const uploadDirectory = path.join(getUploadRootDirectory(), directoryName);
  mkdirSync(uploadDirectory, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDirectory,
      filename(_req, file, callback) {
        const extension = MIME_EXTENSIONS[file.mimetype];
        callback(null, `${filePrefix}-${randomUUID()}${extension}`);
      },
    }),
    limits: {
      files: maxFiles,
      fileSize: env.uploads.maxSizeBytes,
    },
    fileFilter(_req, file, callback) {
      if (!MIME_EXTENSIONS[file.mimetype]) {
        callback(
          new AppError({
            status: 400,
            code: "UPLOAD_FAILED",
            message: "지원하는 이미지 파일만 업로드할 수 있습니다.",
          }),
        );
        return;
      }
      callback(null, true);
    },
  });

  return function imageUpload(req, res, next) {
    upload.array(fieldName, maxFiles)(req, res, (error) => {
      if (error) {
        next(
          error instanceof AppError
            ? error
            : new AppError({
                status: 400,
                code: "UPLOAD_FAILED",
                message: "이미지 업로드에 실패했습니다.",
                cause: error,
              }),
        );
        return;
      }

      req.files = (req.files ?? []).map((file) => ({
        ...file,
        resourceUrl: toUploadResourceUrl(directoryName, file.filename),
      }));
      next();
    });
  };
}

export const listingImageUpload = createImageUpload({
  directoryName: env.uploads.listingImageDir,
  fieldName: "images",
  maxFiles: 4,
  filePrefix: "listing",
});

export const chatImageUpload = createImageUpload({
  directoryName: env.uploads.chatImageDir,
  fieldName: "images",
  maxFiles: 4,
  filePrefix: "chat",
});

export const profileImageUpload = createImageUpload({
  directoryName: env.uploads.profileImageDir,
  fieldName: "image",
  maxFiles: 1,
  filePrefix: "profile",
});
