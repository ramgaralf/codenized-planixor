using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Migrations
{
    /// <inheritdoc />
    public partial class ChangeUserIdToVarchar50 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Shifts",
                type: "varchar(50)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Reminders",
                type: "varchar(50)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "NotificationRecords",
                type: "varchar(50)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "CalendarEvents",
                type: "varchar(50)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "AnnualHoursConfigs",
                type: "varchar(50)",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "char(36)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Shifts",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Reminders",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "NotificationRecords",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "CalendarEvents",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "AnnualHoursConfigs",
                type: "char(36)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "varchar(50)");
        }
    }
}
