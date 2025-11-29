import { LegalDocumentType, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Seed legal documents (Terms of Service, Privacy Policy, etc.)
 */
export async function seedLegalDocuments(prisma: PrismaClient) {
  console.log('📄 Seeding legal documents...');

  const legalDocuments = [
    {
      type: LegalDocumentType.TERMS_OF_SERVICE,
      version: '1.0.0',
      title: 'Terms of Service',
      summary: 'Initial Terms of Service for SwapBuds platform',
      effectiveAt: new Date('2025-01-01'),
      isActive: true,
      fileEn: 'terms-of-service.en.md',
      fileRo: 'terms-of-service.ro.md',
    },
    {
      type: LegalDocumentType.PRIVACY_POLICY,
      version: '1.0.0',
      title: 'Privacy Policy',
      summary: 'Initial Privacy Policy for SwapBuds platform',
      effectiveAt: new Date('2025-01-01'),
      isActive: true,
      fileEn: 'privacy-policy.en.md',
      fileRo: 'privacy-policy.ro.md',
    },
    {
      type: LegalDocumentType.COOKIE_POLICY,
      version: '1.0.0',
      title: 'Cookie Policy',
      summary: 'Initial Cookie Policy for SwapBuds platform',
      effectiveAt: new Date('2025-01-01'),
      isActive: true,
      fileEn: 'cookie-policy.en.md',
      fileRo: 'cookie-policy.ro.md',
    },
  ];

  const legalDocsPath = path.join(__dirname, '../legal-documents');

  let docsCreated = 0;
  for (const doc of legalDocuments) {
    try {
      // Check if already exists
      const existing = await prisma.legalDocument.findUnique({
        where: {
          type_version: {
            type: doc.type,
            version: doc.version,
          },
        },
      });

      if (existing) {
        console.log(
          `   ⏭️  ${doc.type} v${doc.version} already exists, skipping...`,
        );
        continue;
      }

      // Read markdown files
      const pathEn = path.join(legalDocsPath, doc.fileEn);
      const pathRo = path.join(legalDocsPath, doc.fileRo);

      let contentEn: string;
      let contentRo: string;

      // Check if files exist, otherwise use placeholder
      if (fs.existsSync(pathEn)) {
        contentEn = fs.readFileSync(pathEn, 'utf-8');
      } else {
        contentEn = `# ${doc.title}\n\n*This document is currently being prepared. Please check back soon.*`;
      }

      if (fs.existsSync(pathRo)) {
        contentRo = fs.readFileSync(pathRo, 'utf-8');
      } else {
        contentRo = `# ${doc.title}\n\n*Acest document este în curs de pregătire. Vă rugăm să reveniți în curând.*`;
      }

      // If setting as active, deactivate other versions
      if (doc.isActive) {
        await prisma.legalDocument.updateMany({
          where: {
            type: doc.type,
            isActive: true,
          },
          data: {
            isActive: false,
          },
        });
      }

      // Create the document
      await prisma.legalDocument.create({
        data: {
          type: doc.type,
          version: doc.version,
          contentEn,
          contentRo,
          title: doc.title,
          summary: doc.summary,
          effectiveAt: doc.effectiveAt,
          isActive: doc.isActive,
        },
      });

      console.log(`   ✅ Created ${doc.type} v${doc.version}`);
      docsCreated++;
    } catch (error) {
      console.error(`   ❌ Error processing ${doc.type}: ${error.message}`);
    }
  }

  console.log(`✅ Seeded ${docsCreated} legal documents`);
}
