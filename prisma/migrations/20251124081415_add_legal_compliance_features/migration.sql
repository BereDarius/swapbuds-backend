-- CreateEnum
CREATE TYPE "LegalDocumentType" AS ENUM ('TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'COOKIE_POLICY', 'COMMUNITY_GUIDELINES');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ageVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "cookieConsent" JSONB,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "privacyVersion" TEXT,
ADD COLUMN     "selfDeclaredAge18" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tosAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "tosVersion" TEXT;

-- CreateTable
CREATE TABLE "legal_documents" (
    "id" TEXT NOT NULL,
    "type" "LegalDocumentType" NOT NULL,
    "version" TEXT NOT NULL,
    "contentEn" TEXT NOT NULL,
    "contentRo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "effectiveAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "legal_consents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "LegalDocumentType" NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "legal_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "legal_documents_type_isActive_idx" ON "legal_documents"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "legal_documents_type_version_key" ON "legal_documents"("type", "version");

-- CreateIndex
CREATE INDEX "legal_consents_userId_idx" ON "legal_consents"("userId");

-- CreateIndex
CREATE INDEX "legal_consents_documentType_idx" ON "legal_consents"("documentType");

-- CreateIndex
CREATE INDEX "legal_consents_userId_documentType_idx" ON "legal_consents"("userId", "documentType");

-- AddForeignKey
ALTER TABLE "legal_consents" ADD CONSTRAINT "legal_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
