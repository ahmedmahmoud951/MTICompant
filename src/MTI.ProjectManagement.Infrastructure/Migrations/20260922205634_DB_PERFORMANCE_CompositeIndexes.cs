using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MTI.ProjectManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class DB_PERFORMANCE_CompositeIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Documents_UploadedBy",
                table: "Documents");

            migrationBuilder.DropIndex(
                name: "IX_CompanyAssets_ProjectId",
                table: "CompanyAssets");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_AssignedToUserId_Status",
                table: "Tasks",
                columns: new[] { "AssignedToUserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_DueAt_Status",
                table: "Tasks",
                columns: new[] { "DueAt", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_ProjectId_Status",
                table: "Tasks",
                columns: new[] { "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ProjectInvoices_ProjectId_Status",
                table: "ProjectInvoices",
                columns: new[] { "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_UserId_IsRead",
                table: "Notifications",
                columns: new[] { "UserId", "IsRead" });

            migrationBuilder.CreateIndex(
                name: "IX_Messages_ConversationId_CreatedAt",
                table: "Messages",
                columns: new[] { "ConversationId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Documents_ProjectId_Status",
                table: "Documents",
                columns: new[] { "ProjectId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Documents_SiteId_Status",
                table: "Documents",
                columns: new[] { "SiteId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_Documents_UploadedBy_Status",
                table: "Documents",
                columns: new[] { "UploadedBy", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_CompanyAssets_ProjectId_AssignedToSiteId",
                table: "CompanyAssets",
                columns: new[] { "ProjectId", "AssignedToSiteId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Tasks_AssignedToUserId_Status",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_DueAt_Status",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_ProjectId_Status",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_ProjectInvoices_ProjectId_Status",
                table: "ProjectInvoices");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_UserId_IsRead",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Messages_ConversationId_CreatedAt",
                table: "Messages");

            migrationBuilder.DropIndex(
                name: "IX_Documents_ProjectId_Status",
                table: "Documents");

            migrationBuilder.DropIndex(
                name: "IX_Documents_SiteId_Status",
                table: "Documents");

            migrationBuilder.DropIndex(
                name: "IX_Documents_UploadedBy_Status",
                table: "Documents");

            migrationBuilder.DropIndex(
                name: "IX_CompanyAssets_ProjectId_AssignedToSiteId",
                table: "CompanyAssets");

            migrationBuilder.CreateIndex(
                name: "IX_Documents_UploadedBy",
                table: "Documents",
                column: "UploadedBy");

            migrationBuilder.CreateIndex(
                name: "IX_CompanyAssets_ProjectId",
                table: "CompanyAssets",
                column: "ProjectId");
        }
    }
}
