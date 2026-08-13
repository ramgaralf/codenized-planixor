using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Migrations
{
    /// <inheritdoc />
    public partial class AlignSyncIndexesToSyncedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Shifts_UserId_ModifiedAt",
                table: "Shifts");

            migrationBuilder.DropIndex(
                name: "IX_Reminders_UserId_ModifiedAt",
                table: "Reminders");

            migrationBuilder.DropIndex(
                name: "IX_NotificationRecords_UserId_ModifiedAt",
                table: "NotificationRecords");

            migrationBuilder.DropIndex(
                name: "IX_CalendarEvents_UserId_ModifiedAt",
                table: "CalendarEvents");

            migrationBuilder.DropIndex(
                name: "IX_AnnualHoursConfigs_UserId_ModifiedAt",
                table: "AnnualHoursConfigs");

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_UserId_SyncedAt",
                table: "Shifts",
                columns: new[] { "UserId", "SyncedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ShiftModeSettings_UserId_SyncedAt",
                table: "ShiftModeSettings",
                columns: new[] { "UserId", "SyncedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Reminders_UserId_SyncedAt",
                table: "Reminders",
                columns: new[] { "UserId", "SyncedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRecords_UserId_SyncedAt",
                table: "NotificationRecords",
                columns: new[] { "UserId", "SyncedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CalendarEvents_UserId_SyncedAt",
                table: "CalendarEvents",
                columns: new[] { "UserId", "SyncedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AnnualHoursConfigs_UserId_SyncedAt",
                table: "AnnualHoursConfigs",
                columns: new[] { "UserId", "SyncedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Shifts_UserId_SyncedAt",
                table: "Shifts");

            migrationBuilder.DropIndex(
                name: "IX_ShiftModeSettings_UserId_SyncedAt",
                table: "ShiftModeSettings");

            migrationBuilder.DropIndex(
                name: "IX_Reminders_UserId_SyncedAt",
                table: "Reminders");

            migrationBuilder.DropIndex(
                name: "IX_NotificationRecords_UserId_SyncedAt",
                table: "NotificationRecords");

            migrationBuilder.DropIndex(
                name: "IX_CalendarEvents_UserId_SyncedAt",
                table: "CalendarEvents");

            migrationBuilder.DropIndex(
                name: "IX_AnnualHoursConfigs_UserId_SyncedAt",
                table: "AnnualHoursConfigs");

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_UserId_ModifiedAt",
                table: "Shifts",
                columns: new[] { "UserId", "ModifiedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Reminders_UserId_ModifiedAt",
                table: "Reminders",
                columns: new[] { "UserId", "ModifiedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_NotificationRecords_UserId_ModifiedAt",
                table: "NotificationRecords",
                columns: new[] { "UserId", "ModifiedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_CalendarEvents_UserId_ModifiedAt",
                table: "CalendarEvents",
                columns: new[] { "UserId", "ModifiedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AnnualHoursConfigs_UserId_ModifiedAt",
                table: "AnnualHoursConfigs",
                columns: new[] { "UserId", "ModifiedAt" });
        }
    }
}
