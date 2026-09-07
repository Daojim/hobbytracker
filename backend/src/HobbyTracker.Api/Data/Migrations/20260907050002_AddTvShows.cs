using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddTvShows : Migration
    {
        /// <summary>
        /// The third detail table, plus the first child table under one, plus a fourth source.
        ///
        /// **Why `tmdb-tv` is a source of its own rather than more rows under `tmdb`.** TMDB
        /// numbers films and shows in separate sequences, so 1396 is both Breaking Bad and an
        /// unrelated film. `media` has one unique index on (source_id, external_id), so under a
        /// single source row those two are one row — and it would not even surface as an error,
        /// because the catalog upsert's 23505 recovery re-reads and hands back whichever got
        /// there first. `SchemaTests.The_same_tmdb_id_as_a_film_and_as_a_show_is_two_titles`
        /// fails with exactly that duplicate-key violation if the two ever share a source.
        ///
        /// **Why `tv_seasons` is a table and not a jsonb column.** One column was the first
        /// choice: seasons are read whole, written whole and never queried alone, so a join buys
        /// nothing. EF Core 10 refuses JSON-mapped owned types on a Table-Per-Type entity —
        /// *"Only TPH inheritance is supported for those entities"*, a boot failure, lifted in
        /// EF 11 — and a jsonb blob can carry neither a check constraint nor a unique key, which
        /// is the wrong trade in a schema whose tests exist to prove the database enforces what
        /// it claims. As a table it gets one row per season and `season_number >= 0` for free.
        ///
        /// **`total_runtime_minutes` is generated, not written.** Three places read the whole
        /// run — both of LibraryService's terminal projections and its Length sort arm — and
        /// none of them repeats `episodes × runtime`. Null propagates through the multiplication
        /// on its own, so an untimed show sorts last rather than as though it took no time.
        ///
        /// Nothing here needs `defaultValueSql` for its NOT NULL text[] columns, for the reason
        /// AddMovies gives: the tables are new, so there are no rows for 23502 to fail on.
        /// </summary>
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tv_shows",
                columns: table => new
                {
                    media_id = table.Column<int>(type: "integer", nullable: false),
                    first_air_year = table.Column<int>(type: "integer", nullable: true),
                    last_air_year = table.Column<int>(type: "integer", nullable: true),
                    air_status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    number_of_seasons = table.Column<int>(type: "integer", nullable: true),
                    number_of_episodes = table.Column<int>(type: "integer", nullable: true),
                    episode_runtime_minutes = table.Column<int>(type: "integer", nullable: true),
                    total_runtime_minutes = table.Column<int>(type: "integer", nullable: true, computedColumnSql: "number_of_episodes * episode_runtime_minutes", stored: true),
                    genres = table.Column<List<string>>(type: "text[]", nullable: false),
                    primary_genre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    creators = table.Column<List<string>>(type: "text[]", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tv_shows", x => x.media_id);
                    table.CheckConstraint("ck_tv_shows_counts_positive", "(number_of_seasons IS NULL OR number_of_seasons > 0)\nAND (number_of_episodes IS NULL OR number_of_episodes > 0)");
                    table.CheckConstraint("ck_tv_shows_episode_runtime_positive", "episode_runtime_minutes IS NULL OR episode_runtime_minutes > 0");
                    table.CheckConstraint("ck_tv_shows_year_span", "first_air_year IS NULL OR last_air_year IS NULL OR last_air_year >= first_air_year");
                    table.ForeignKey(
                        name: "fk_tv_shows_media_id",
                        column: x => x.media_id,
                        principalTable: "media",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tv_seasons",
                columns: table => new
                {
                    media_id = table.Column<int>(type: "integer", nullable: false),
                    season_number = table.Column<int>(type: "integer", nullable: false),
                    episode_count = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_tv_seasons", x => new { x.media_id, x.season_number });
                    table.CheckConstraint("ck_tv_seasons_episode_count", "episode_count >= 0");
                    table.CheckConstraint("ck_tv_seasons_season_number", "season_number >= 0");
                    table.ForeignKey(
                        name: "fk_tv_seasons_tv_shows_media_id",
                        column: x => x.media_id,
                        principalTable: "tv_shows",
                        principalColumn: "media_id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "source_lu",
                columns: new[] { "id", "base_url", "name" },
                values: new object[] { 4, "https://api.themoviedb.org/3/tv/", "tmdb-tv" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tv_seasons");

            migrationBuilder.DropTable(
                name: "tv_shows");

            migrationBuilder.DeleteData(
                table: "source_lu",
                keyColumn: "id",
                keyValue: 4);
        }
    }
}
