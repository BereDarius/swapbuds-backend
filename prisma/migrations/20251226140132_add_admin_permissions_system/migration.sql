-- CreateEnum
CREATE TYPE "PermissionCategory" AS ENUM ('TICKETS', 'MODERATION', 'USERS', 'DISPUTES', 'ADMIN_MANAGEMENT', 'STATS', 'SYSTEM');

-- CreateTable
CREATE TABLE "admin_permissions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "PermissionCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_user_permissions" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "grantedBy" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_user_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_permissions_name_key" ON "admin_permissions" ("name");

-- CreateIndex
CREATE INDEX "admin_permissions_category_idx" ON "admin_permissions" ("category");

-- CreateIndex
CREATE INDEX "admin_permissions_name_idx" ON "admin_permissions" ("name");

-- CreateIndex
CREATE INDEX "admin_user_permissions_adminUserId_idx" ON "admin_user_permissions" ("adminUserId");

-- CreateIndex
CREATE INDEX "admin_user_permissions_permissionId_idx" ON "admin_user_permissions" ("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_permissions_adminUserId_permissionId_key" ON "admin_user_permissions" ("adminUserId", "permissionId");

-- AddForeignKey
ALTER TABLE "admin_user_permissions"
ADD CONSTRAINT "admin_user_permissions_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_permissions"
ADD CONSTRAINT "admin_user_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "admin_permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default permissions
INSERT INTO
    "admin_permissions" (
        "id",
        "name",
        "description",
        "category"
    )
VALUES
    -- Ticketing System Permissions (Future feature)
    (
        gen_random_uuid (),
        'tickets:view',
        'View support tickets',
        'TICKETS'
    ),
    (
        gen_random_uuid (),
        'tickets:view_all',
        'View all support tickets',
        'TICKETS'
    ),
    (
        gen_random_uuid (),
        'tickets:create',
        'Create support tickets',
        'TICKETS'
    ),
    (
        gen_random_uuid (),
        'tickets:assign',
        'Assign tickets to agents',
        'TICKETS'
    ),
    (
        gen_random_uuid (),
        'tickets:update',
        'Update ticket status and details',
        'TICKETS'
    ),
    (
        gen_random_uuid (),
        'tickets:close',
        'Close/resolve tickets',
        'TICKETS'
    ),
    (
        gen_random_uuid (),
        'tickets:delete',
        'Delete tickets',
        'TICKETS'
    ),
    (
        gen_random_uuid (),
        'tickets:internal_notes',
        'Add internal notes to tickets',
        'TICKETS'
    ),

-- Moderation Permissions
(
    gen_random_uuid (),
    'moderation:flags_view',
    'View flagged content',
    'MODERATION'
),
(
    gen_random_uuid (),
    'moderation:flags_review',
    'Review and action flagged content',
    'MODERATION'
),
(
    gen_random_uuid (),
    'moderation:content_remove',
    'Remove content (items, comments)',
    'MODERATION'
),
(
    gen_random_uuid (),
    'moderation:content_restore',
    'Restore removed content',
    'MODERATION'
),
(
    gen_random_uuid (),
    'moderation:user_warn',
    'Warn users for violations',
    'MODERATION'
),
(
    gen_random_uuid (),
    'moderation:user_suspend',
    'Suspend user accounts',
    'MODERATION'
),
(
    gen_random_uuid (),
    'moderation:user_ban',
    'Ban user accounts permanently',
    'MODERATION'
),

-- User Management Permissions
(
    gen_random_uuid (),
    'users:view',
    'View user details',
    'USERS'
),
(
    gen_random_uuid (),
    'users:view_all',
    'View all users and analytics',
    'USERS'
),
(
    gen_random_uuid (),
    'users:edit',
    'Edit user profiles',
    'USERS'
),
(
    gen_random_uuid (),
    'users:verification_review',
    'Review user verification submissions',
    'USERS'
),
(
    gen_random_uuid (),
    'users:verification_approve',
    'Approve/reject user verifications',
    'USERS'
),
(
    gen_random_uuid (),
    'users:gdpr_export',
    'Export user data (GDPR)',
    'USERS'
),
(
    gen_random_uuid (),
    'users:gdpr_delete',
    'Delete user data (GDPR)',
    'USERS'
),

-- Dispute Resolution Permissions
(
    gen_random_uuid (),
    'disputes:view',
    'View trade disputes',
    'DISPUTES'
),
(
    gen_random_uuid (),
    'disputes:assign',
    'Assign disputes to admins',
    'DISPUTES'
),
(
    gen_random_uuid (),
    'disputes:resolve',
    'Resolve disputes',
    'DISPUTES'
),
(
    gen_random_uuid (),
    'disputes:escalate',
    'Escalate disputes to higher level',
    'DISPUTES'
),

-- Admin Management Permissions
(
    gen_random_uuid (),
    'admin:view',
    'View admin users',
    'ADMIN_MANAGEMENT'
),
(
    gen_random_uuid (),
    'admin:create',
    'Create new admin accounts',
    'ADMIN_MANAGEMENT'
),
(
    gen_random_uuid (),
    'admin:edit',
    'Edit admin user details',
    'ADMIN_MANAGEMENT'
),
(
    gen_random_uuid (),
    'admin:permissions_manage',
    'Manage admin permissions',
    'ADMIN_MANAGEMENT'
),
(
    gen_random_uuid (),
    'admin:role_change',
    'Change admin roles',
    'ADMIN_MANAGEMENT'
),
(
    gen_random_uuid (),
    'admin:deactivate',
    'Deactivate admin accounts',
    'ADMIN_MANAGEMENT'
),
(
    gen_random_uuid (),
    'admin:invites_create',
    'Create admin invitations (Future)',
    'ADMIN_MANAGEMENT'
),
(
    gen_random_uuid (),
    'admin:invites_approve',
    'Approve pending admin accounts (Future)',
    'ADMIN_MANAGEMENT'
),

-- Statistics & Analytics Permissions
(
    gen_random_uuid (),
    'stats:view_basic',
    'View basic statistics',
    'STATS'
),
(
    gen_random_uuid (),
    'stats:view_advanced',
    'View detailed analytics',
    'STATS'
),
(
    gen_random_uuid (),
    'stats:export',
    'Export statistics reports',
    'STATS'
),

-- System Configuration Permissions
(
    gen_random_uuid (),
    'system:config_view',
    'View system configuration',
    'SYSTEM'
),
(
    gen_random_uuid (),
    'system:config_edit',
    'Edit system configuration',
    'SYSTEM'
),
(
    gen_random_uuid (),
    'system:audit_logs',
    'View audit logs',
    'SYSTEM'
),
(
    gen_random_uuid (),
    'system:maintenance',
    'Perform system maintenance',
    'SYSTEM'
);
