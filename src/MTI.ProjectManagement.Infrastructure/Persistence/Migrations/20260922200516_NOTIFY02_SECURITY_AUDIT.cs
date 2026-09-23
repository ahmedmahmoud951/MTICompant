using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MTI.ProjectManagement.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class NOTIFY02_SECURITY_AUDIT : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CorrectionReason",
                table: "DocumentVersions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "EditableUntil",
                table: "DocumentVersions",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "ProjectId",
                table: "AuditLogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SiteId",
                table: "AuditLogs",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_Action",
                table: "AuditLogs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_ProjectId",
                table: "AuditLogs",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_SiteId",
                table: "AuditLogs",
                column: "SiteId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_Action",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_ProjectId",
                table: "AuditLogs");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_SiteId",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "CorrectionReason",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "EditableUntil",
                table: "DocumentVersions");

            migrationBuilder.DropColumn(
                name: "ProjectId",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "SiteId",
                table: "AuditLogs");
        }
    }
}
