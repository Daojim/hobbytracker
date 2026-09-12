using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaReleaseWindow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateOnly>(
                name: "release_date",
                table: "media",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "release_end",
                table: "media",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "release_precision",
                table: "media",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "release_status",
                table: "media",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_media_release_end",
                table: "media",
                column: "release_end");

            migrationBuilder.AddCheckConstraint(
                name: "ck_media_release_window",
                table: "media",
                sql: "CASE\r\n    WHEN release_precision IS NULL\r\n        THEN release_date IS NULL AND release_end IS NULL\r\n    WHEN release_precision = 'Unknown'\r\n        THEN release_date IS NULL AND release_end IS NULL\r\n    WHEN release_precision IN ('Day', 'Month', 'Quarter', 'Year')\r\n        THEN release_date IS NOT NULL AND release_end IS NOT NULL\r\n             AND release_end >= release_date\r\n    ELSE false\r\nEND");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_media_release_end",
                table: "media");

            migrationBuilder.DropCheckConstraint(
                name: "ck_media_release_window",
                table: "media");

            migrationBuilder.DropColumn(
                name: "release_date",
                table: "media");

            migrationBuilder.DropColumn(
                name: "release_end",
                table: "media");

            migrationBuilder.DropColumn(
                name: "release_precision",
                table: "media");

            migrationBuilder.DropColumn(
                name: "release_status",
                table: "media");
        }
    }
}
