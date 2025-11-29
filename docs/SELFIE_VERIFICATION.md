# Live Selfie Verification Feature

## Overview

The live selfie verification feature adds an additional security layer to the ID verification system by requiring users to submit a live selfie photo holding their ID document. This helps verify that the person submitting the verification is the actual owner of the ID document.

## Purpose

- **Identity Verification**: Ensures the person submitting the ID is the actual owner
- **Security Enhancement**: Prevents stolen/borrowed ID document usage
- **Fraud Prevention**: Helps admins detect fake or mismatched documents
- **Compliance**: Strengthens KYC (Know Your Customer) requirements

## Implementation

### Database Schema

Added `selfieUrl` field to `UserVerification` model:

```prisma
model UserVerification {
  id                String   @id @default(uuid())
  userId            String   @unique

  documentType      DocumentType
  documentUrlFront  String  // Front of ID document
  documentUrlBack   String? // Back of ID document (optional for passports)
  selfieUrl         String  // Live selfie photo holding ID (NEW)

  status            VerificationStatus @default(PENDING)
  // ... other fields
}
```

### Backend Changes

#### DTO Updates

**SubmitVerificationDto** - Added selfie URL requirement:

```typescript
export class SubmitVerificationDto {
  @ApiProperty({ enum: DocumentType })
  @IsEnum(DocumentType)
  documentType: DocumentType;

  @ApiProperty({ description: 'URL of front of ID document' })
  @IsString()
  @IsNotEmpty()
  documentUrlFront: string;

  @ApiProperty({
    description: 'URL of back of ID document (optional)',
    required: false,
  })
  @IsString()
  @IsOptional()
  documentUrlBack?: string;

  @ApiProperty({
    description: 'URL of live selfie photo for identity verification',
  })
  @IsString()
  @IsNotEmpty()
  selfieUrl: string; // NEW - Required field
}
```

#### Service Updates

**VerificationService** - Encryption/Decryption:

```typescript
// On submission
const encryptedSelfieUrl = this.documentSecurity.encryptUrl(dto.selfieUrl);

await this.prisma.userVerification.create({
  data: {
    documentUrlFront: encryptedFrontUrl,
    documentUrlBack: encryptedBackUrl,
    selfieUrl: encryptedSelfieUrl, // NEW
    // ... other fields
  },
});

// On retrieval (for admin)
const decryptedVerifications = verifications.map((v) => ({
  ...v,
  documentUrlFront: this.documentSecurity.decryptUrl(v.documentUrlFront),
  documentUrlBack: v.documentUrlBack
    ? this.documentSecurity.decryptUrl(v.documentUrlBack)
    : undefined,
  selfieUrl: this.documentSecurity.decryptUrl(v.selfieUrl), // NEW
}));
```

**VerificationCleanupService** - GDPR Compliance:

```typescript
// Delete all three images during cleanup
private async deleteVerificationDocument(verification: any, reason: string) {
  // Delete front document
  if (verification.documentUrlFront) {
    await this.documentSecurity.deleteDocument(publicId);
  }

  // Delete back document (if exists)
  if (verification.documentUrlBack) {
    await this.documentSecurity.deleteDocument(publicId);
  }

  // Delete selfie photo (NEW)
  if (verification.selfieUrl) {
    await this.documentSecurity.deleteDocument(publicId);
  }

  // Set all URLs to null
  await this.prisma.userVerification.update({
    where: { id: verification.id },
    data: {
      documentUrlFront: null,
      documentUrlBack: null,
      selfieUrl: null, // NEW
    },
  });
}
```

### Frontend Changes

#### User Verification Form

**State Management**:

```typescript
const [frontImage, setFrontImage] = useState<File | null>(null);
const [backImage, setBackImage] = useState<File | null>(null);
const [selfieImage, setSelfieImage] = useState<File | null>(null); // NEW

const [frontPreview, setFrontPreview] = useState<string>('');
const [backPreview, setBackPreview] = useState<string>('');
const [selfiePreview, setSelfiePreview] = useState<string>(''); // NEW
```

**File Upload Handler**:

```typescript
const handleFileChange = async (
  e: React.ChangeEvent<HTMLInputElement>,
  side: 'front' | 'back' | 'selfie', // Extended to include selfie
) => {
  // ... compression logic

  if (side === 'front') {
    setFrontImage(file);
    setFrontPreview(compressed);
  } else if (side === 'back') {
    setBackImage(file);
    setBackPreview(compressed);
  } else {
    setSelfieImage(file);
    setSelfiePreview(compressed); // NEW
  }
};
```

**Form Validation**:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!frontImage) {
    toast.error('Please upload front image of your document');
    return;
  }

  if (!backImage && documentType === 'ID_CARD') {
    toast.error('Please upload back image of your ID card');
    return;
  }

  if (!selfieImage) {
    toast.error('Please upload a live selfie photo'); // NEW
    return;
  }

  submitMutation.mutate({
    documentType,
    documentUrlFront: frontPreview,
    documentUrlBack: backPreview || undefined,
    selfieUrl: selfiePreview, // NEW
  });
};
```

**UI Section**:

```tsx
<div>
  <Label>Live Selfie Photo</Label>
  <p className="mt-1 text-sm text-muted-foreground">
    Take a live selfie holding your ID document next to your face
  </p>
  <div className="mt-2">
    {selfiePreview ? (
      <div className="relative">
        <img
          src={selfiePreview}
          alt="Selfie"
          className="w-full rounded-lg border"
        />
        <Button
          onClick={() => {
            setSelfieImage(null);
            setSelfiePreview('');
          }}
        >
          Remove
        </Button>
      </div>
    ) : (
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8">
        <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Click to upload selfie photo
        </span>
        <input
          type="file"
          accept="image/*"
          capture="user" // Uses front camera on mobile
          className="hidden"
          onChange={(e) => handleFileChange(e, 'selfie')}
        />
      </label>
    )}
  </div>
</div>
```

#### Admin Review Page

**Selfie Preview Card**:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Eye className="h-5 w-5" />
      Live Selfie Photo
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
      {verification.selfieUrl.startsWith('data:') ? (
        <OptimizedImage
          src={verification.selfieUrl}
          alt="Live Selfie"
          fill
          className="object-contain"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Eye className="h-12 w-12 text-muted-foreground" />
        </div>
      )}
    </div>
    <p className="mt-2 text-sm text-muted-foreground">
      Compare this selfie with the photo on the ID document to verify identity
    </p>
  </CardContent>
</Card>
```

### TypeScript Types

**Frontend Types**:

```typescript
export interface SubmitVerificationDto {
  documentType: DocumentType;
  documentUrlFront: string;
  documentUrlBack?: string;
  selfieUrl: string; // NEW - Required
}

export interface VerificationRequest {
  id: string;
  userId: string;
  documentType: DocumentType;
  documentUrlFront: string;
  documentUrlBack?: string;
  selfieUrl: string; // NEW - Required
  status: VerificationStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
}
```

## Migration

Migration created: `20251129114316_add_verification_selfie`

**Migration Steps**:

```sql
-- Step 1: Add selfieUrl as nullable first
ALTER TABLE "user_verifications"
ADD COLUMN "selfieUrl" TEXT;

-- Step 2: Set a default value for existing rows (use documentUrlFront as placeholder)
UPDATE "user_verifications"
SET "selfieUrl" = "documentUrlFront"
WHERE "selfieUrl" IS NULL;

-- Step 3: Make selfieUrl required (NOT NULL)
ALTER TABLE "user_verifications"
ALTER COLUMN "selfieUrl" SET NOT NULL;
```

**Applied Successfully**: ✅ Migration applied and Prisma client regenerated

## User Flow

1. User navigates to `/verification` page
2. User selects document type (ID Card, Passport, Driver's License)
3. User uploads **front** of document (required)
4. User uploads **back** of document (required for ID cards only)
5. User uploads **live selfie** holding ID document (required - NEW)
6. User submits verification request
7. Admin reviews all three images
8. Admin compares selfie to ID photo
9. Admin approves (with DOB) or rejects (with reason)

## Admin Review Process

1. Admin navigates to `/admin/verification`
2. Admin clicks on pending verification
3. Admin sees three preview cards:
   - **Document Front**: Main ID document image
   - **Document Back**: Reverse side (if applicable)
   - **Live Selfie Photo**: User holding ID (NEW)
4. Admin compares selfie face to ID photo
5. Admin checks if ID is held in selfie
6. Admin approves or rejects with notes

## Security Features

### Encryption

- All three URLs encrypted at rest using AES-256-CBC
- Encryption key stored in environment variables
- Decryption only occurs when admin views verification

### GDPR Compliance

- All three images automatically deleted after retention period:
  - **Approved**: 30 days after approval
  - **Rejected**: 90 days after rejection
  - **Underage**: 90 days after rejection
- Manual deletion available for GDPR requests
- Audit trail maintained for all deletions

### Access Control

- Only admins can view decrypted documents
- Temporary signed URLs for Cloudinary images
- Role-based access control enforced

## Testing

### Backend Tests

File: `src/verification/verification-emails.spec.ts`

Updated all test cases to include `selfieUrl`:

```typescript
await service.submitVerification(userId, {
  documentType: 'ID_CARD' as any,
  documentUrlFront: 'https://example.com/doc.jpg',
  selfieUrl: 'https://example.com/selfie.jpg', // Added to all tests
});
```

**Test Results**: ✅ All 6 tests passing

### Frontend Tests

- Component tests pending
- Integration tests pending
- E2E tests pending

## Best Practices

### For Users

1. **Good Lighting**: Take selfie in well-lit area
2. **Clear Face**: Ensure face is clearly visible
3. **Hold ID**: Hold ID document next to face
4. **Readable ID**: ID details should be readable in selfie
5. **Live Photo**: Must be live photo, not screenshot

### For Admins

1. **Compare Faces**: Verify selfie face matches ID photo
2. **Check for ID**: Ensure ID is visible in selfie
3. **Look for Tampering**: Check for edited/manipulated images
4. **Verify Liveness**: Look for signs photo is live (not screenshot)
5. **Document Findings**: Add internal notes for future reference

## Known Limitations

1. **No Liveness Detection**: Currently no automated liveness detection (Phase 2)
2. **Manual Review**: All verifications require manual admin review
3. **No AI/OCR**: No automated document reading (Phase 2)
4. **Base64 Storage**: Currently using base64 data URLs (should migrate to Cloudinary)
5. **Mobile Optimization**: May need better mobile camera integration

## Future Enhancements

### Phase 2 (Post-Launch)

- [ ] AI-powered liveness detection
- [ ] Automatic face matching between selfie and ID
- [ ] OCR for automatic data extraction from ID
- [ ] Real-time document verification
- [ ] Cloudinary direct uploads (instead of base64)
- [ ] Video selfie option (3-5 seconds)
- [ ] Improved mobile camera experience

### Phase 3 (Future)

- [ ] Blockchain-based verification certificates
- [ ] Third-party identity verification integration
- [ ] Multi-document support (passport + driver's license)
- [ ] International ID support
- [ ] Accessibility improvements (voice guidance)

## References

- **Backend Service**: `src/verification/verification.service.ts`
- **Frontend Form**: `src/app/(main)/verification/page.tsx`
- **Admin Review**: `src/app/(main)/admin/verification/[id]/page.tsx`
- **Cleanup Service**: `src/verification/verification-cleanup.service.ts`
- **Database Schema**: `prisma/schema.prisma`
- **Migration**: `prisma/migrations/20251129114316_add_verification_selfie/`

## Change Log

**Version 0.9.1 - November 29, 2025**

- ✅ Added `selfieUrl` field to UserVerification model
- ✅ Updated backend DTOs to require selfie URL
- ✅ Added encryption/decryption for selfie URL
- ✅ Updated frontend form with selfie upload
- ✅ Added selfie preview to admin detail page
- ✅ Updated cleanup service for GDPR compliance
- ✅ Updated all test cases
- ✅ Created and applied database migration
- ✅ Updated documentation

**Status**: Feature complete and ready for testing ✅
