-- Esquema inicial de CitasPegy para Microsoft SQL Server.
-- Ejecutar sobre una base de datos vacía llamada CitasPegy.
-- Nunca guardar contraseñas en texto plano: PasswordHash debe contener un hash BCrypt/Argon2.

CREATE TABLE dbo.Users (
    UserId INT IDENTITY(1,1) PRIMARY KEY,
    DocumentType NVARCHAR(10) NOT NULL,
    FirstName NVARCHAR(100) NOT NULL,
    LastName NVARCHAR(100) NOT NULL,
    Phone NVARCHAR(30) NOT NULL,
    Email NVARCHAR(254) NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL CONSTRAINT DF_Users_Role DEFAULT N'Cliente',
    IsActive BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Role CHECK (Role IN (N'Cliente', N'Especialista', N'Administrador'))
);
GO

CREATE TABLE dbo.Businesses (
    BusinessId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(150) NOT NULL,
    BusinessType NVARCHAR(50) NOT NULL,
    Address NVARCHAR(250) NOT NULL,
    Phone NVARCHAR(30) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Businesses_IsActive DEFAULT 1
);
GO

CREATE TABLE dbo.Specialists (
    UserId INT PRIMARY KEY,
    BusinessId INT NOT NULL,
    Specialty NVARCHAR(100) NOT NULL,
    CONSTRAINT FK_Specialists_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Specialists_Businesses FOREIGN KEY (BusinessId) REFERENCES dbo.Businesses(BusinessId)
);
GO

CREATE TABLE dbo.Services (
    ServiceId INT IDENTITY(1,1) PRIMARY KEY,
    BusinessId INT NOT NULL,
    Name NVARCHAR(150) NOT NULL,
    Description NVARCHAR(500) NOT NULL,
    DurationMinutes INT NOT NULL,
    Price DECIMAL(12,2) NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Services_IsActive DEFAULT 1,
    CONSTRAINT FK_Services_Businesses FOREIGN KEY (BusinessId) REFERENCES dbo.Businesses(BusinessId),
    CONSTRAINT CK_Services_Duration CHECK (DurationMinutes > 0),
    CONSTRAINT CK_Services_Price CHECK (Price >= 0)
);
GO

CREATE TABLE dbo.Appointments (
    AppointmentId INT IDENTITY(1,1) PRIMARY KEY,
    BookingCode NVARCHAR(30) NOT NULL,
    ClientUserId INT NOT NULL,
    SpecialistUserId INT NOT NULL,
    ServiceId INT NOT NULL,
    AppointmentDate DATE NOT NULL,
    StartTime TIME(0) NOT NULL,
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Appointments_Status DEFAULT N'Confirmada',
    Notes NVARCHAR(500) NULL,
    -- Snapshot al reservar: los cambios futuros en Services no alteran la cita histórica.
    ServiceNameSnapshot NVARCHAR(150) NOT NULL,
    DurationSnapshotMinutes INT NOT NULL,
    PriceSnapshot DECIMAL(12,2) NOT NULL,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Appointments_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_Appointments_BookingCode UNIQUE (BookingCode),
    CONSTRAINT FK_Appointments_Client FOREIGN KEY (ClientUserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT FK_Appointments_Specialist FOREIGN KEY (SpecialistUserId) REFERENCES dbo.Specialists(UserId),
    CONSTRAINT FK_Appointments_Service FOREIGN KEY (ServiceId) REFERENCES dbo.Services(ServiceId),
    CONSTRAINT CK_Appointments_Status CHECK (Status IN (N'Pendiente', N'Confirmada', N'Atendida', N'No asistió', N'Cancelada')),
    CONSTRAINT CK_Appointments_Snapshot CHECK (DurationSnapshotMinutes > 0 AND PriceSnapshot >= 0)
);
GO

CREATE INDEX IX_Appointments_Date_Specialist ON dbo.Appointments(AppointmentDate, SpecialistUserId, StartTime);
CREATE INDEX IX_Appointments_Client_Date ON dbo.Appointments(ClientUserId, AppointmentDate DESC);
GO

CREATE TABLE dbo.PasswordResetTokens (
    ResetId BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId INT NOT NULL,
    Channel NVARCHAR(10) NOT NULL,
    Destination NVARCHAR(254) NOT NULL,
    TokenHash VARBINARY(32) NOT NULL,
    ExpiresAt DATETIME2 NOT NULL,
    UsedAt DATETIME2 NULL,
    Attempts INT NOT NULL CONSTRAINT DF_PasswordResetTokens_Attempts DEFAULT 0,
    CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_PasswordResetTokens_CreatedAt DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_PasswordResetTokens_Users FOREIGN KEY (UserId) REFERENCES dbo.Users(UserId),
    CONSTRAINT CK_PasswordResetTokens_Channel CHECK (Channel IN (N'email', N'sms')),
    CONSTRAINT CK_PasswordResetTokens_Attempts CHECK (Attempts >= 0)
);
GO

CREATE INDEX IX_PasswordResetTokens_User_Expiry ON dbo.PasswordResetTokens(UserId, ExpiresAt DESC);
GO
