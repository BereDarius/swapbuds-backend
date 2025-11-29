# Legal Documents

Place your legal document markdown files in this directory.

## Expected Files

- `terms-of-service.en.md` - Terms of Service (English)
- `terms-of-service.ro.md` - Terms of Service (Romanian)
- `privacy-policy.en.md` - Privacy Policy (English)
- `privacy-policy.ro.md` - Privacy Policy (Romanian)
- `cookie-policy.en.md` - Cookie Policy (English)
- `cookie-policy.ro.md` - Cookie Policy (Romanian)

## File Format

Files should be in Markdown format. The content will be stored in the database and rendered on the frontend.

## Running the Seed

After placing your files here, run:

```bash
yarn seed
```

Or:

```bash
npx prisma db seed
```

The seed script will:

1. Read each markdown file
2. Insert the content into the `legal_documents` table
3. Set the documents as active
4. Skip if documents already exist

If a file is missing, the seed script will create a placeholder document.
