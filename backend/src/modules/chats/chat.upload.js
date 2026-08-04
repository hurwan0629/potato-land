import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import multer from "multer";

import { AppError } from "../../common/errors/AppError.js";
import { env } from "../../config/env.js";

const uploadDirectory = path.resolve(
  process.cwd(),
  env.uploads.baseDir,
  env.uploads.chatImageDir,
);

const extensionByMimeType = Object.freeze({
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
});

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    mkdir(uploadDirectory, { recursive: true })
      .then(() => callback(null, uploadDirectory))
      .catch(callback);
  },
  filename(_req, file, callback) {
    callback(null, `chat-${randomUUID()}${extensionByMimeType[file.mimetype]}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 4,
    fileSize: env.uploads.maxSizeBytes,
  },
  fileFilter(_req, file, callback) {
    if (!extensionByMimeType[file.mimetype]) {
      callback(
        new AppError({
          status: 400,
          code: "UPLOAD_FAILED",
          message: "이미지 파일만 업로드할 수 있습니다.",
        }),
      );
      return;
    }
    callback(null, true);
  },
});

export function chatImageUpload(req, res, next) {
  upload.array("images", 4)(req, res, (error) => {
    if (!error) {
      req.files = (req.files ?? []).map((file) => ({
        ...file,
        resourceUrl: `/resources/${env.uploads.chatImageDir}/${file.filename}`,
      }));
      next();
      return;
    }

    next(
      error instanceof AppError
        ? error
        : new AppError({
            status: 400,
            code: "UPLOAD_FAILED",
            message: "채팅 이미지 업로드에 실패했습니다.",
          }),
    );
  });
}
