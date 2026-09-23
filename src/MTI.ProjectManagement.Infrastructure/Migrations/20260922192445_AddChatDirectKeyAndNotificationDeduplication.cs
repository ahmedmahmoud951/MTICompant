using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MTI.ProjectManagement.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChatDirectKeyAndNotificationDeduplication : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BodyKey",
                table: "Notifications",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DataJson",
                table: "Notifications",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "EventKey",
                table: "Notifications",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RecipientUserId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "TitleKey",
                table: "Notifications",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DirectConversationKey",
                table: "Conversations",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_EventKey",
                table: "Notifications",
                column: "EventKey",
                unique: true,
                filter: "[EventKey] IS NOT NULL AND [EventKey] <> ''");

            migrationBuilder.CreateIndex(
                name: "IX_Conversations_DirectConversationKey",
                table: "Conversations",
                column: "DirectConversationKey",
                unique: true,
                filter: "[DirectConversationKey] IS NOT NULL AND [DirectConversationKey] <> ''");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Notifications_EventKey",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_Conversations_DirectConversationKey",
                table: "Conversations");

            migrationBuilder.DropColumn(
                name: "BodyKey",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "DataJson",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "EventKey",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "RecipientUserId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "TitleKey",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "DirectConversationKey",
                table: "Conversations");
        }
    }
}
