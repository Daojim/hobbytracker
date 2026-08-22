using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddGameGenres : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<string>>(
                name: "genres",
                table: "games",
                type: "text[]",
                nullable: false,

                // Hand-added. EF scaffolds a NOT NULL text[] with no default, and Postgres
                // refuses that on a table with rows in it — 23502, on the games you have already
                // searched for. Left in place afterwards rather than dropped, for the same
                // reason logged_at keeps its now(): a row written by hand in psql is still valid.
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<string>(
                name: "primary_genre",
                table: "games",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "genres",
                table: "games");

            migrationBuilder.DropColumn(
                name: "primary_genre",
                table: "games");
        }
    }
}
