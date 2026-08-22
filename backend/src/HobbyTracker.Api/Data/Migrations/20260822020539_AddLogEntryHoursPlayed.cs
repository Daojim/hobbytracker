using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLogEntryHoursPlayed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "hours_played",
                table: "log_entries",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_log_entries_hours_played_range",
                table: "log_entries",
                sql: "hours_played IS NULL OR (hours_played > 0 AND hours_played <= 999.99)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_log_entries_hours_played_range",
                table: "log_entries");

            migrationBuilder.DropColumn(
                name: "hours_played",
                table: "log_entries");
        }
    }
}
