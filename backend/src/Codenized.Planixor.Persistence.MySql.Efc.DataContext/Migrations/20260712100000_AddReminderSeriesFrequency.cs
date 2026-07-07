using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Migrations
{
    /// <inheritdoc />
    public partial class AddReminderSeriesFrequency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SeriesFrequency",
                table: "Reminders",
                type: "varchar(10)",
                nullable: false,
                defaultValue: "never");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SeriesFrequency",
                table: "Reminders");
        }
    }
}
