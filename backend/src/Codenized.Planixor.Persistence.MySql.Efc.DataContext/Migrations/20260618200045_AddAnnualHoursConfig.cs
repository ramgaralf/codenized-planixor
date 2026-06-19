using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Migrations
{
    /// <inheritdoc />
    public partial class AddAnnualHoursConfig : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AnnualHoursConfigs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false),
                    Year = table.Column<int>(type: "int", nullable: false),
                    ConfiguredHours = table.Column<int>(type: "int", nullable: false),
                    ModifiedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AnnualHoursConfigs", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_AnnualHoursConfigs_UserId",
                table: "AnnualHoursConfigs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_AnnualHoursConfigs_UserId_ModifiedAt",
                table: "AnnualHoursConfigs",
                columns: new[] { "UserId", "ModifiedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AnnualHoursConfigs_UserId_Year",
                table: "AnnualHoursConfigs",
                columns: new[] { "UserId", "Year" },
                unique: true,
                filter: "IsDeleted = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AnnualHoursConfigs");
        }
    }
}
