# SwapBuds Backend Documentation

Welcome to the SwapBuds backend API documentation. This directory contains comprehensive guides for all backend features, infrastructure, and administration.

---

## 📚 Quick Navigation

### 🚀 Getting Started

- **[Setup Guide](SETUP.md)** - Installation, environment setup, and deployment
- **[Architecture Overview](ARCHITECTURE.md)** - System design and structure
- **[Testing Guide](TESTING.md)** - Running tests, coverage, and best practices

### 🔐 Security & Compliance

- **[Security](SECURITY.md)** - Authentication, authorization, and security measures
- **[GDPR Compliance](GDPR.md)** - Data protection and privacy regulations

### 📊 Database

- **[Database ERD](database-erd.md)** - Entity relationship diagram and schema

---

## 🎯 Feature Documentation

### User Management

**[User Management](features/user-management.md)** - Comprehensive user features

- Authentication (JWT, OAuth, MFA)
- User profiles and settings
- Identity verification (ID documents)
- Selfie verification (live photo with ID)

### Core Features

- **[Items](features/ITEMS.md)** - Item listings, categories, and search
- **[Trades](features/TRADES.md)** - Trade proposals, workflow, and completion
- **[Reviews](features/REVIEWS.md)** - User reviews and ratings
- **[Messages](features/MESSAGES.md)** - Real-time chat and messaging
- **[Notifications](features/NOTIFICATIONS.md)** - Push and email notifications

### Social Features

**[Social Features](features/social.md)** - Community interactions

- Comments (threading and moderation)
- Likes (favorites and popular items)

### Support

- **[Support](features/SUPPORT.md)** - Customer support tickets and chat

---

## 🛡️ Administration

### Admin & Moderation

**[Administration](admin/administration.md)** - Admin tools and content moderation

- Admin dashboard (platform statistics)
- User management (roles, bans, suspensions)
- Content moderation (flagging and review)
- Dispute resolution (trade conflicts)

### Monitoring

- **[Monitoring](admin/MONITORING.md)** - Application monitoring, logging, and alerts

---

## 🏗️ Infrastructure

### Performance & Storage

- **[Caching](infrastructure/CACHING.md)** - Redis caching strategies
- **[Upload](infrastructure/UPLOAD.md)** - File upload and Cloudinary integration

---

## 📖 Documentation Structure

```
docs/
├── README.md                          # This file
├── SETUP.md                           # Installation and setup
├── ARCHITECTURE.md                    # System architecture
├── TESTING.md                         # Testing guide
├── SECURITY.md                        # Security documentation
├── GDPR.md                            # GDPR compliance
├── database-erd.md                    # Database schema
│
├── features/                          # Feature documentation
│   ├── user-management.md            # Auth, profiles, verification
│   ├── social.md                     # Comments and likes
│   ├── ITEMS.md                      # Item listings
│   ├── TRADES.md                     # Trading system
│   ├── REVIEWS.md                    # Reviews and ratings
│   ├── MESSAGES.md                   # Real-time messaging
│   ├── NOTIFICATIONS.md              # Notifications
│   └── SUPPORT.md                    # Customer support
│
├── admin/                             # Administration docs
│   ├── administration.md             # Admin, moderation, disputes
│   └── MONITORING.md                 # Monitoring and logging
│
└── infrastructure/                    # Infrastructure docs
    ├── CACHING.md                    # Caching strategies
    └── UPLOAD.md                     # File uploads
```

---

## 🔗 Related Documentation

- **[Root Documentation](../../../docs/)** - Project-wide documentation
- **[Frontend Documentation](../../swapbuds-frontend/docs/)** - Frontend guides
- **[API Documentation](https://api.swapbuds.com/docs)** - Interactive Swagger docs

---

## 📝 Documentation Standards

All documentation follows these standards:

- **Clear headings** - Hierarchical structure with H1-H4
- **Code examples** - Working examples with request/response
- **API endpoints** - Method, path, auth, and description
- **Cross-references** - Links to related modules
- **Last updated date** - Track documentation freshness

---

## 🤝 Contributing

When adding or updating documentation:

1. Follow existing structure and formatting
2. Include practical code examples
3. Update this README if adding new docs
4. Test all API examples
5. Add "Last Updated" date at bottom

---

## 🆘 Need Help?

- **Issues:** Report documentation issues on GitHub
- **Questions:** Contact the development team
- **API:** Interactive API docs at `/api/docs` (Swagger)

---

**Last Updated:** December 21, 2025
**Version:** v0.9.0
