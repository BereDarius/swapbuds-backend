import { LegalDocumentType, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

/**
 * Seed script for legal documents
 * Reads markdown files and inserts them into the database
 */
async function main() {
  console.log('🌱 Starting seed...');

  // Define legal documents to seed
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

  const legalDocsPath = path.join(__dirname, 'legal-documents');

  for (const doc of legalDocuments) {
    console.log(`📄 Processing ${doc.type} v${doc.version}...`);

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
        console.log(`   ✅ Loaded English content from ${doc.fileEn}`);
      } else {
        contentEn = `# ${doc.title}\n\n*This document is currently being prepared. Please check back soon.*`;
        console.log(`   ⚠️  File not found: ${doc.fileEn}, using placeholder`);
      }

      if (fs.existsSync(pathRo)) {
        contentRo = fs.readFileSync(pathRo, 'utf-8');
        console.log(`   ✅ Loaded Romanian content from ${doc.fileRo}`);
      } else {
        contentRo = `# ${doc.title}\n\n*Acest document este în curs de pregătire. Vă rugăm să reveniți în curând.*`;
        console.log(`   ⚠️  File not found: ${doc.fileRo}, using placeholder`);
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
    } catch (error) {
      console.error(`   ❌ Error processing ${doc.type}:`, error);
    }
  }

  console.log('✅ Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
