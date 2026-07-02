using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationRecords : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlertOffsetsJson",
                table: "CalendarEvents",
                type: "varchar(50)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.CreateTable(
                name: "NotificationRecords",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false),
                    CalendarEventId = table.Column<Guid>(type: "char(36)", nullable: false),
                    AlertOffset = table.Column<int>(type: "int", nullable: false),
                    TriggerTime = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    IsDelivered = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    IsRead = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationRecords", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRecords_CalendarEventId_AlertOffset_IsDeleted",
                table: "NotificationRecords",
                columns: new[] { "CalendarEventId", "AlertOffset", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRecords_UserId_IsDeleted",
                table: "NotificationRecords",
                columns: new[] { "UserId", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRecords_UserId_ModifiedAt",
                table: "NotificationRecords",
                columns: new[] { "UserId", "ModifiedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationRecords");

            migrationBuilder.DropColumn(
                name: "AlertOffsetsJson",
                table: "CalendarEvents");
        }
    }
}
