using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AnimeTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "anime",
                columns: table => new
                {
                    media_id = table.Column<int>(type: "integer", nullable: false),
                    english_title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    media_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    episode_count = table.Column<int>(type: "integer", nullable: true),
                    episode_runtime_seconds = table.Column<int>(type: "integer", nullable: true),
                    total_runtime_minutes = table.Column<int>(type: "integer", nullable: true, computedColumnSql: "episode_count * episode_runtime_seconds / 60", stored: true),
                    start_season = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    start_year = table.Column<int>(type: "integer", nullable: true),
                    air_status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    source_material = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    genres = table.Column<List<string>>(type: "text[]", nullable: false),
                    primary_genre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    studios = table.Column<List<string>>(type: "text[]", nullable: false),
                    mean_score = table.Column<decimal>(type: "numeric(4,2)", precision: 4, scale: 2, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_anime", x => x.media_id);
                    table.CheckConstraint("ck_anime_counts_positive", "(episode_count IS NULL OR episode_count > 0)\nAND (episode_runtime_seconds IS NULL OR episode_runtime_seconds > 0)");
                    table.CheckConstraint("ck_anime_mean_score_range", "mean_score IS NULL OR (mean_score >= 1.0 AND mean_score <= 10.0)");
                    table.ForeignKey(
                        name: "fk_anime_media_id",
                        column: x => x.media_id,
                        principalTable: "media",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "source_lu",
                columns: new[] { "id", "base_url", "name" },
                values: new object[] { 5, "https://api.myanimelist.net/v2/", "mal" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "anime");

            migrationBuilder.DeleteData(
                table: "source_lu",
                keyColumn: "id",
                keyValue: 5);
        }
    }
}
