using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHltbTimes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "hltb_checked_at",
                table: "games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "hltb_completionist_hours",
                table: "games",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "hltb_main_extra_hours",
                table: "games",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "release_year",
                table: "games",
                type: "integer",
                nullable: true);

            // All four columns are nullable, so none of them needs the defaultValueSql that
            // AddGameGenres had to hand-add: that trap is specific to a NOT NULL text[] landing
            // on a table with rows already in it.
            migrationBuilder.AddCheckConstraint(
                name: "ck_games_hltb_hours_positive",
                table: "games",
                sql: """
                     (hltb_main_story_hours    IS NULL OR hltb_main_story_hours    > 0) AND
                     (hltb_main_extra_hours    IS NULL OR hltb_main_extra_hours    > 0) AND
                     (hltb_completionist_hours IS NULL OR hltb_completionist_hours > 0)
                     """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_games_hltb_hours_positive",
                table: "games");

            migrationBuilder.DropColumn(
                name: "hltb_checked_at",
                table: "games");

            migrationBuilder.DropColumn(
                name: "hltb_completionist_hours",
                table: "games");

            migrationBuilder.DropColumn(
                name: "hltb_main_extra_hours",
                table: "games");

            migrationBuilder.DropColumn(
                name: "release_year",
                table: "games");
        }
    }
}
