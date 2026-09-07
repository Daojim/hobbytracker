using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLogEntryProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "episode_number",
                table: "log_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "season_number",
                table: "log_entries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_log_entries_episode_needs_season",
                table: "log_entries",
                sql: "episode_number IS NULL OR season_number IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_log_entries_episode_range",
                table: "log_entries",
                sql: "episode_number IS NULL OR episode_number >= 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_log_entries_season_range",
                table: "log_entries",
                sql: "season_number IS NULL OR season_number >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_log_entries_episode_needs_season",
                table: "log_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_log_entries_episode_range",
                table: "log_entries");

            migrationBuilder.DropCheckConstraint(
                name: "ck_log_entries_season_range",
                table: "log_entries");

            migrationBuilder.DropColumn(
                name: "episode_number",
                table: "log_entries");

            migrationBuilder.DropColumn(
                name: "season_number",
                table: "log_entries");
        }
    }
}
