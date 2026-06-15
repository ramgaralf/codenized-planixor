using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Codenized.Planixor.Persistence.MySql.Efc.DataContext.Migrations
{
    /// <inheritdoc />
    public partial class AddShift : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "Shifts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "char(36)", nullable: false),
                    UserId = table.Column<Guid>(type: "char(36)", nullable: false),
                    Name = table.Column<string>(type: "varchar(50)", nullable: false),
                    Icon = table.Column<string>(type: "varchar(10)", nullable: false),
                    BackgroundColor = table.Column<string>(type: "varchar(7)", nullable: false),
                    StartTime = table.Column<int>(type: "int", nullable: false),
                    EndTime = table.Column<int>(type: "int", nullable: false),
                    HoursWorked = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: true),
                    ModifiedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    SyncedAt = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "tinyint(1)", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shifts", x => x.Id);
                })
                .Annotation("MySQL:Charset", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_UserId",
                table: "Shifts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Shifts_UserId_ModifiedAt",
                table: "Shifts",
                columns: new[] { "UserId", "ModifiedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Shifts");
        }
    }
}
