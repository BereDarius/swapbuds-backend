# Release vX.Y.Z - [Feature Name]

**Release Date**: [Month, Year]
**Version**: X.Y.Z
**Release Type**: [Feature Release | Patch Release | Major Release]

## 🎯 Overview

[Brief 2-3 sentence description of what this release accomplishes and its main purpose]

## ✨ New Features

### [Feature Category 1]

- **[Feature Name]**: [Description]
- **[Feature Name]**: [Description]
- **[Feature Name]**: [Description]

### [Feature Category 2]

- **[Feature Name]**: [Description]
- **[Feature Name]**: [Description]

## 🔌 API Endpoints

[If applicable - can be omitted for internal refactors]

### New Endpoints

| Method   | Endpoint      | Description   | Authorization      |
| -------- | ------------- | ------------- | ------------------ |
| [METHOD] | `/api/[path]` | [Description] | [Auth requirement] |

### WebSocket Events

[If applicable]

| Event          | Direction       | Description   |
| -------------- | --------------- | ------------- |
| `[event-name]` | [Client/Server] | [Description] |

## 🏗️ Technical Implementation

### New Modules

- **[ModuleName]**: [Description of purpose]
- **[ServiceName]**: [Description of purpose]
- **[ControllerName]**: [Description of purpose]

### Updated Modules

[If applicable]

- **[ModuleName]**: [What was changed/added]

### Database Migrations

[If applicable]

**Migration: [migration_name]**

```prisma
// Key schema changes
model [ModelName] {
  // Important fields
}
```

### Dependencies

[If new dependencies added]

- `[package-name@version]`: [Purpose]

### Configuration

[If new environment variables or config needed]

New environment variables:

- `[ENV_VAR_NAME]`: [Description]

## 📝 Business Rules

### [Feature/Operation Name]

- ✅ [Rule or constraint]
- ✅ [Rule or constraint]
- ✅ [Rule or constraint]

### [Another Feature/Operation]

- ✅ [Rule or constraint]
- ✅ [Rule or constraint]

## 🔄 Migration Notes

[Instructions for upgrading from previous version]

```bash
# Example migration commands
[commands if needed]
```

[Or state: "No database migrations required." if applicable]

## 🚀 Deployment

### Prerequisites

- [Prerequisite 1]
- [Prerequisite 2]

### Installation

```bash
# Pull latest code
git pull origin main

# Install dependencies (if new ones added)
yarn install

# Run migrations (if applicable)
yarn prisma migrate deploy

# Generate Prisma client (if schema changed)
yarn prisma generate

# Restart application
yarn start:prod
```

### Environment Variables

[If applicable]

Add/update the following in your `.env` file:

```env
[ENV_VAR_NAME]=[example value]
```

## 🧪 Testing

- **Unit Tests**: [Number] tests passing
- **Integration Tests**: [If applicable]
- **Test Coverage**: [If known]

```bash
# Run tests
yarn test

# Run tests with coverage
yarn test:cov
```

## 📊 Performance Impact

[If applicable - performance improvements, cache impact, etc.]

- [Metric or improvement description]

## 🐛 Bug Fixes

[If this is a patch release or includes bug fixes]

- Fixed: [Bug description]
- Fixed: [Bug description]

## ⚠️ Breaking Changes

[If any - usually only for major releases]

- **[Change description]**: [Migration instructions]

## 📚 Documentation

[Links to updated docs if applicable]

- Updated: [Doc name]
- Added: [Doc name]

## 🙏 Acknowledgments

[Optional - credit contributors if applicable]

## 📝 Notes

[Any additional notes, known issues, or future plans]

---

**Previous Release**: [vX.Y.Z]
**Next Release**: [Planned features or TBD]
