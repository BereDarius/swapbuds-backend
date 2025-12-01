# Upload Module

## Overview

The Upload module manages file uploads with Cloudinary integration for images and documents.

**Features:**

- Image upload and management
- Document upload
- Cloudinary integration
- File validation
- Storage optimization
- URL generation
- File deletion

## Endpoints

| Method | Endpoint           | Auth   | Description     |
| ------ | ------------------ | ------ | --------------- |
| POST   | `/upload/image`    | JWT    | Upload image    |
| POST   | `/upload/document` | JWT    | Upload document |
| DELETE | `/upload/:id`      | JWT    | Delete upload   |
| GET    | `/upload/:id`      | Public | Get upload info |

## Upload Image

```bash
POST /upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data
{
  "file": <image_file>,
  "folder": "items"
}
```

**Response (201):**

```json
{
  "id": "upload-123",
  "url": "https://res.cloudinary.com/.../image.jpg",
  "publicId": "swapbuds/items/image-123",
  "type": "IMAGE",
  "size": 245678,
  "mimeType": "image/jpeg",
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "uploadedAt": "2025-11-23T10:30:00Z"
}
```

## Upload Document

```bash
POST /upload/document
Authorization: Bearer <token>
Content-Type: multipart/form-data
{
  "file": <document_file>,
  "folder": "verification"
}
```

**Response (201):**

```json
{
  "id": "upload-124",
  "url": "https://res.cloudinary.com/.../document.pdf",
  "publicId": "swapbuds/verification/doc-124",
  "type": "DOCUMENT",
  "size": 512000,
  "mimeType": "application/pdf",
  "uploadedAt": "2025-11-23T10:30:00Z"
}
```

## Delete Upload

```bash
DELETE /upload/upload-123
Authorization: Bearer <token>
```

**Response (200):**

```json
{
  "message": "Upload deleted successfully"
}
```

## Supported File Types

**Images:**

- JPG/JPEG
- PNG
- WebP
- GIF

**Documents:**

- PDF
- DOC/DOCX
- XLS/XLSX
- TXT

## Implementation Details

**Module:** `src/upload/`

**Key Files:**

- `upload.controller.ts` - API endpoints
- `upload.service.ts` - Business logic
- Cloudinary integration
