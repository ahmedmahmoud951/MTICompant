using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MTI.ProjectManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationsAccountingAssetsAndChatArchitecture : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Messages_SenderUserId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_MessageReactions_MessageId",
                table: "MessageReactions");

            migrationBuilder.AddColumn<Guid>(
                name: "DocumentId",
                table: "ProjectInvoices",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "InvoiceDate",
                table: "ProjectInvoices",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<decimal>(
                name: "Tax",
                table: "ProjectInvoices",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "ClientMessageId",
                table: "Messages",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "Messages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Duration",
                table: "MessageAttachments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Height",
                table: "MessageAttachments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ThumbnailMediaFileId",
                table: "MessageAttachments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "MessageAttachments",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Width",
                table: "MessageAttachments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InstalledQuantity",
                table: "Materials",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "MaterialCode",
                table: "Materials",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "OrderedQuantity",
                table: "Materials",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ReceivedQuantity",
                table: "Materials",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RemainingQuantity",
                table: "Materials",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "RequiredQuantity",
                table: "Materials",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastMessageAt",
                table: "Conversations",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LastMessageId",
                table: "Conversations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SiteId",
                table: "Conversations",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "Conversations",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "Archived",
                table: "ConversationMembers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastReadAt",
                table: "ConversationMembers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "LastReadMessageId",
                table: "ConversationMembers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LeftAt",
                table: "ConversationMembers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "Muted",
                table: "ConversationMembers",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "AssetCode",
                table: "CompanyAssets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AssetType",
                table: "CompanyAssets",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Brand",
                table: "CompanyAssets",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IPAddress",
                table: "CompanyAssets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "InstallationDate",
                table: "CompanyAssets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "CompanyAssets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MacAddress",
                table: "CompanyAssets",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProjectId",
                table: "CompanyAssets",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SiteId",
                table: "CompanyAssets",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "WarrantyEnd",
                table: "CompanyAssets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "WarrantyStart",
                table: "CompanyAssets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DailySiteReports",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SiteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EngineerUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Manpower = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    WorkCompleted = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Problems = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    MaterialsReceived = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    MaterialsUsed = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Equipment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    SafetyNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    TomorrowPlan = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    RevisionNumber = table.Column<int>(type: "int", nullable: false),
                    ParentReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ReviewNotes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailySiteReports", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailySiteReports_DailySiteReports_ParentReportId",
                        column: x => x.ParentReportId,
                        principalTable: "DailySiteReports",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_DailySiteReports_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailySiteReports_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DailySiteReports_Teams_TeamId",
                        column: x => x.TeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_DailySiteReports_Users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DailySiteReports_Users_EngineerUserId",
                        column: x => x.EngineerUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DailySiteReports_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MessageReceipts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReadAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MessageReceipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MessageReceipts_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MessageReceipts_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SiteOperations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SiteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OperationType = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    AssignedUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AssignedTeamId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Progress = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SiteOperations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SiteOperations_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SiteOperations_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SiteOperations_Teams_AssignedTeamId",
                        column: x => x.AssignedTeamId,
                        principalTable: "Teams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_SiteOperations_Users_AssignedUserId",
                        column: x => x.AssignedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "WarrantyAlertLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CompanyAssetId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AlertThresholdDays = table.Column<int>(type: "int", nullable: false),
                    SentAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WarrantyAlertLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WarrantyAlertLogs_CompanyAssets_CompanyAssetId",
                        column: x => x.CompanyAssetId,
                        principalTable: "CompanyAssets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "DailyReportAttachments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DailySiteReportId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaFileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AttachmentType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DailyReportAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DailyReportAttachments_DailySiteReports_DailySiteReportId",
                        column: x => x.DailySiteReportId,
                        principalTable: "DailySiteReports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DailyReportAttachments_MediaFiles_MediaFileId",
                        column: x => x.MediaFileId,
                        principalTable: "MediaFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OperationPhotos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OperationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SiteId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaFileId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UploaderUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationPhotos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationPhotos_MediaFiles_MediaFileId",
                        column: x => x.MediaFileId,
                        principalTable: "MediaFiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OperationPhotos_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "Projects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OperationPhotos_SiteOperations_OperationId",
                        column: x => x.OperationId,
                        principalTable: "SiteOperations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OperationPhotos_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_OperationPhotos_Users_UploaderUserId",
                        column: x => x.UploaderUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OperationWorkLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OperationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Hours = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OperationWorkLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OperationWorkLogs_SiteOperations_OperationId",
                        column: x => x.OperationId,
                        principalTable: "SiteOperations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_OperationWorkLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectInvoices_DocumentId",
                table: "ProjectInvoices",
                column: "DocumentId");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderUserId_ClientMessageId",
                table: "Messages",
                columns: new[] { "SenderUserId", "ClientMessageId" },
                unique: true,
                filter: "[ClientMessageId] IS NOT NULL AND [ClientMessageId] <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_MessageId_UserId_Reaction",
                table: "MessageReactions",
                columns: new[] { "MessageId", "UserId", "Reaction" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_SiteId",
                table: "Conversations",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyAssets_ProjectId",
                table: "CompanyAssets",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyReportAttachments_DailySiteReportId",
                table: "DailyReportAttachments",
                column: "DailySiteReportId");

            migrationBuilder.CreateIndex(
                name: "IX_DailyReportAttachments_MediaFileId",
                table: "DailyReportAttachments",
                column: "MediaFileId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_ApprovedByUserId",
                table: "DailySiteReports",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_EngineerUserId",
                table: "DailySiteReports",
                column: "EngineerUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_ParentReportId",
                table: "DailySiteReports",
                column: "ParentReportId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_ProjectId",
                table: "DailySiteReports",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_ReportDate",
                table: "DailySiteReports",
                column: "ReportDate");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_ReviewedByUserId",
                table: "DailySiteReports",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_SiteId",
                table: "DailySiteReports",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_Status",
                table: "DailySiteReports",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_DailySiteReports_TeamId",
                table: "DailySiteReports",
                column: "TeamId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReceipts_MessageId_UserId",
                table: "MessageReceipts",
                columns: new[] { "MessageId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MessageReceipts_UserId",
                table: "MessageReceipts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationPhotos_MediaFileId",
                table: "OperationPhotos",
                column: "MediaFileId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationPhotos_OperationId",
                table: "OperationPhotos",
                column: "OperationId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationPhotos_ProjectId",
                table: "OperationPhotos",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationPhotos_SiteId",
                table: "OperationPhotos",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationPhotos_UploaderUserId",
                table: "OperationPhotos",
                column: "UploaderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationWorkLogs_OperationId",
                table: "OperationWorkLogs",
                column: "OperationId");

            migrationBuilder.CreateIndex(
                name: "IX_OperationWorkLogs_UserId",
                table: "OperationWorkLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_SiteOperations_AssignedTeamId",
                table: "SiteOperations",
                column: "AssignedTeamId");

            migrationBuilder.CreateIndex(
                name: "IX_SiteOperations_AssignedUserId",
                table: "SiteOperations",
                column: "AssignedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_SiteOperations_ProjectId",
                table: "SiteOperations",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_SiteOperations_SiteId",
                table: "SiteOperations",
                column: "SiteId");

            migrationBuilder.CreateIndex(
                name: "IX_SiteOperations_Status",
                table: "SiteOperations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_WarrantyAlertLogs_CompanyAssetId_AlertThresholdDays",
                table: "WarrantyAlertLogs",
                columns: new[] { "CompanyAssetId", "AlertThresholdDays" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_CompanyAssets_Projects_ProjectId",
                table: "CompanyAssets",
                column: "ProjectId",
                principalTable: "Projects",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Conversations_Sites_SiteId",
                table: "Conversations",
                column: "SiteId",
                principalTable: "Sites",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ProjectInvoices_Documents_DocumentId",
                table: "ProjectInvoices",
                column: "DocumentId",
                principalTable: "Documents",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_CompanyAssets_Projects_ProjectId",
                table: "CompanyAssets");

            migrationBuilder.DropForeignKey(
                name: "FK_Conversations_Sites_SiteId",
                table: "Conversations");

            migrationBuilder.DropForeignKey(
                name: "FK_ProjectInvoices_Documents_DocumentId",
                table: "ProjectInvoices");

            migrationBuilder.DropTable(
                name: "DailyReportAttachments");

            migrationBuilder.DropTable(
                name: "MessageReceipts");

            migrationBuilder.DropTable(
                name: "OperationPhotos");

            migrationBuilder.DropTable(
                name: "OperationWorkLogs");

            migrationBuilder.DropTable(
                name: "WarrantyAlertLogs");

            migrationBuilder.DropTable(
                name: "DailySiteReports");

            migrationBuilder.DropTable(
                name: "SiteOperations");

            migrationBuilder.DropIndex(
                name: "IX_ProjectInvoices_DocumentId",
                table: "ProjectInvoices");

            migrationBuilder.DropIndex(
                name: "IX_Messages_SenderUserId_ClientMessageId",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_MessageReactions_MessageId_UserId_Reaction",
                table: "MessageReactions");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_SiteId",
                table: "Conversations");

            migrationBuilder.DropIndex(
                name: "IX_CompanyAssets_ProjectId",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "DocumentId",
                table: "ProjectInvoices");

            migrationBuilder.DropColumn(
                name: "InvoiceDate",
                table: "ProjectInvoices");

            migrationBuilder.DropColumn(
                name: "Tax",
                table: "ProjectInvoices");

            migrationBuilder.DropColumn(
                name: "ClientMessageId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "Duration",
                table: "MessageAttachments");

            migrationBuilder.DropColumn(
                name: "Height",
                table: "MessageAttachments");

            migrationBuilder.DropColumn(
                name: "ThumbnailMediaFileId",
                table: "MessageAttachments");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "MessageAttachments");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "MessageAttachments");

            migrationBuilder.DropColumn(
                name: "InstalledQuantity",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "MaterialCode",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "OrderedQuantity",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "ReceivedQuantity",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "RemainingQuantity",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "RequiredQuantity",
                table: "Materials");

            migrationBuilder.DropColumn(
                name: "LastMessageAt",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "LastMessageId",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "SiteId",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "Archived",
                table: "ConversationMembers");

            migrationBuilder.DropColumn(
                name: "LastReadAt",
                table: "ConversationMembers");

            migrationBuilder.DropColumn(
                name: "LastReadMessageId",
                table: "ConversationMembers");

            migrationBuilder.DropColumn(
                name: "LeftAt",
                table: "ConversationMembers");

            migrationBuilder.DropColumn(
                name: "Muted",
                table: "ConversationMembers");

            migrationBuilder.DropColumn(
                name: "AssetCode",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "AssetType",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "Brand",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "IPAddress",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "InstallationDate",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "Location",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "MacAddress",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "SiteId",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "WarrantyEnd",
                table: "CompanyAssets");

            migrationBuilder.DropColumn(
                name: "WarrantyStart",
                table: "CompanyAssets");

            migrationBuilder.CreateIndex(
                name: "IX_Messages_SenderUserId",
                table: "Messages",
                column: "SenderUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MessageReactions_MessageId",
                table: "MessageReactions",
                column: "MessageId");
        }
    }
}
