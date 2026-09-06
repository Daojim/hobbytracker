using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMovies : Migration
    {
        /// <summary>
        /// The second detail table, and the first time Table-Per-Type is doing what it was
        /// chosen for: `movies` sits beside `games`, sharing `media` and nothing else.
        ///
        /// Note what is *not* here. AddGameGenres had to hand-write `defaultValueSql: "'{}'"`
        /// for its NOT NULL text[], because Postgres refuses to add one to a table with rows in
        /// it (23502). This table is new, so it has no rows for that to fail on — worth saying,
        /// since the next person will look for it.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "movies",
                columns: table => new
                {
                    media_id = table.Column<int>(type: "integer", nullable: false),
                    release_year = table.Column<int>(type: "integer", nullable: true),
                    runtime_minutes = table.Column<int>(type: "integer", nullable: true),
                    genres = table.Column<List<string>>(type: "text[]", nullable: false),
                    primary_genre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    directors = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_movies", x => x.media_id);
                    table.CheckConstraint("ck_movies_runtime_positive", "runtime_minutes IS NULL OR runtime_minutes > 0");
                    table.ForeignKey(
                        name: "fk_movies_media_id",
                        column: x => x.media_id,
                        principalTable: "media",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            // The source row and SeedData.Sources.NameFor's arm have to land together. Without
            // the arm every MovieDto.Source reads "unknown" and nothing errors; without the row
            // every movie insert fails the foreign key. Neither is much use alone.
            migrationBuilder.InsertData(
                table: "source_lu",
                columns: new[] { "id", "base_url", "name" },
                values: new object[] { 3, "https://api.themoviedb.org/3/", "tmdb" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "movies");

            migrationBuilder.DeleteData(
                table: "source_lu",
                keyColumn: "id",
                keyValue: 3);
        }
    }
}
