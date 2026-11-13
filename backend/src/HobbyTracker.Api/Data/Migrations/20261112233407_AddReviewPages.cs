using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddReviewPages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "opencritic_id",
                table: "games",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "opencritic_looked_for_at",
                table: "games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "steam_app_id",
                table: "games",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "steam_looked_for_at",
                table: "games",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_games_review_ids_positive",
                table: "games",
                sql: "(steam_app_id  IS NULL OR steam_app_id  > 0) AND\r\n(opencritic_id IS NULL OR opencritic_id > 0)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_games_review_ids_positive",
                table: "games");

            migrationBuilder.DropColumn(
                name: "opencritic_id",
                table: "games");

            migrationBuilder.DropColumn(
                name: "opencritic_looked_for_at",
                table: "games");

            migrationBuilder.DropColumn(
                name: "steam_app_id",
                table: "games");

            migrationBuilder.DropColumn(
                name: "steam_looked_for_at",
                table: "games");
        }
    }
}
