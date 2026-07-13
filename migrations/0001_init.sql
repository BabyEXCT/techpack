-- Migration 0001: Initial schema
-- Generated from Prisma schema 2026-07-14

-- Enum-like tables (D1/SQLite doesn't support enums, use TEXT CHECK)
-- but Prisma handles enums as TEXT at D1 level

CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Customer (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL,
    companyName TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    preferredPaymentMethod TEXT,
    deliveryNote TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS InvoiceCounter (
    id TEXT PRIMARY KEY,
    prefix TEXT NOT NULL DEFAULT 'TP-',
    next INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS Invoice (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    invoiceNumber TEXT NOT NULL UNIQUE,
    customerId TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    notes TEXT,
    total REAL NOT NULL DEFAULT 0,
    paymentStatus TEXT NOT NULL DEFAULT 'DRAFT',
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Payment (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    invoiceId TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    reference TEXT,
    notes TEXT,
    paidAt TEXT NOT NULL DEFAULT (datetime('now')),
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Job (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    projectName TEXT NOT NULL,
    customerName TEXT,
    category TEXT,
    material TEXT,
    collarType TEXT,
    cuttingType TEXT,
    colorNotes TEXT,
    sourceMessage TEXT,
    productionNotes TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    customerId TEXT,
    invoiceId TEXT,
    workflowStage TEXT NOT NULL DEFAULT 'NEW',
    priority TEXT NOT NULL DEFAULT 'NORMAL',
    approvalDate TEXT,
    deliveryDate TEXT,
    deletedAt TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    ownerId TEXT NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (customerId) REFERENCES Customer(id) ON DELETE SET NULL,
    FOREIGN KEY (invoiceId) REFERENCES Invoice(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS RosterItem (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    rowNumber INTEGER NOT NULL,
    name TEXT,
    number TEXT,
    size TEXT,
    remarks TEXT,
    jobId TEXT NOT NULL,
    FOREIGN KEY (jobId) REFERENCES Job(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS UploadedFile (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    kind TEXT NOT NULL,
    originalName TEXT NOT NULL,
    storagePath TEXT NOT NULL,
    mimeType TEXT NOT NULL,
    jobId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (jobId) REFERENCES Job(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS GeneratedOutput (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    outputType TEXT NOT NULL,
    storagePath TEXT NOT NULL,
    jobId TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (jobId) REFERENCES Job(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS MessageTemplate (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    body TEXT NOT NULL,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed InvoiceCounter
INSERT OR IGNORE INTO InvoiceCounter (id, prefix, next) VALUES ('default', 'TP-', 1);
