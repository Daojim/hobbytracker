using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPassYears : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "completed_year",
                table: "log_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "started_year",
                table: "log_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_log_entries_finish_day_or_year",
                table: "log_entries",
                sql: "completed_at IS NULL OR completed_year IS NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_log_entries_start_day_or_year",
                table: "log_entries",
                sql: "started_at IS NULL OR started_year IS NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_log_entries_year_order",
                table: "log_entries",
                sql: "started_year IS NULL OR completed_year IS NULL OR completed_year >= started_year");

            migrationBuilder.AddCheckConstraint(
                name: "ck_log_entries_years_range",
                table: "log_entries",
                sql: "(started_year IS NULL OR started_year >= 1900) AND (completed_year IS NULL OR completed_year >= 1900)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_log_entries_finish_day_or_year",
                table: "log_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_log_entries_start_day_or_year",
                table: "log_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_log_entries_year_order",
                table: "log_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_log_entries_years_range",
                table: "log_entries");

            migrationBuilder.DropColumn(
                name: "completed_year",
                table: "log_entries");

            migrationBuilder.DropColumn(
                name: "started_year",
                table: "log_entries");
        }
    }
}
