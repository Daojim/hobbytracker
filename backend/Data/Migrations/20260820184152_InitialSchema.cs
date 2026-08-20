using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "hobby_lu",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_hobby_lu", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "source_lu",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    base_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_source_lu", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    display_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "user"),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "media",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    hobby_id = table.Column<int>(type: "integer", nullable: false),
                    source_id = table.Column<int>(type: "integer", nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    external_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    cover_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_media", x => x.id);
                    table.ForeignKey(
                        name: "fk_media_hobby_lu_hobby_id",
                        column: x => x.hobby_id,
                        principalTable: "hobby_lu",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_media_source_lu_source_id",
                        column: x => x.source_id,
                        principalTable: "source_lu",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "auth_identities",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    provider = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    provider_user_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_auth_identities", x => x.id);
                    table.ForeignKey(
                        name: "fk_auth_identities_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "games",
                columns: table => new
                {
                    media_id = table.Column<int>(type: "integer", nullable: false),
                    platforms = table.Column<List<string>>(type: "text[]", nullable: false),
                    developers = table.Column<List<string>>(type: "text[]", nullable: false),
                    hltb_main_story_hours = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    hltb_id = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_games", x => x.media_id);
                    table.ForeignKey(
                        name: "fk_games_media_id",
                        column: x => x.media_id,
                        principalTable: "media",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "log_entries",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: true),
                    media_id = table.Column<int>(type: "integer", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    rating = table.Column<decimal>(type: "numeric(3,1)", precision: 3, scale: 1, nullable: true),
                    notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    date_started = table.Column<DateOnly>(type: "date", nullable: true),
                    date_completed = table.Column<DateOnly>(type: "date", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_log_entries", x => x.id);
                    table.CheckConstraint("ck_log_entries_date_order", "date_started IS NULL OR date_completed IS NULL OR date_completed >= date_started");
                    table.CheckConstraint("ck_log_entries_rating_range", "rating IS NULL OR (rating >= 1.0 AND rating <= 10.0)");
                    table.ForeignKey(
                        name: "fk_log_entries_media_media_id",
                        column: x => x.media_id,
                        principalTable: "media",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_log_entries_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "hobby_lu",
                columns: new[] { "id", "name" },
                values: new object[,]
                {
                    { 1, "games" },
                    { 2, "movies" },
                    { 3, "tv" },
                    { 4, "anime" },
                    { 5, "books" },
                    { 6, "music" }
                });

            migrationBuilder.InsertData(
                table: "source_lu",
                columns: new[] { "id", "base_url", "name" },
                values: new object[,]
                {
                    { 1, "https://api.igdb.com/v4/", "igdb" },
                    { 2, null, "manual" }
                });

            migrationBuilder.CreateIndex(
                name: "ix_auth_identities_provider_provider_user_id",
                table: "auth_identities",
                columns: new[] { "provider", "provider_user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_auth_identities_user_id",
                table: "auth_identities",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_hobby_lu_name",
                table: "hobby_lu",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_log_entries_media_id",
                table: "log_entries",
                column: "media_id");

            migrationBuilder.CreateIndex(
                name: "ix_log_entries_user_id_media_id",
                table: "log_entries",
                columns: new[] { "user_id", "media_id" });

            migrationBuilder.CreateIndex(
                name: "ix_media_hobby_id",
                table: "media",
                column: "hobby_id");

            migrationBuilder.CreateIndex(
                name: "ix_media_source_id_external_id",
                table: "media",
                columns: new[] { "source_id", "external_id" },
                unique: true,
                filter: "external_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_source_lu_name",
                table: "source_lu",
                column: "name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "auth_identities");

            migrationBuilder.DropTable(
                name: "games");

            migrationBuilder.DropTable(
                name: "log_entries");

            migrationBuilder.DropTable(
                name: "media");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "hobby_lu");

            migrationBuilder.DropTable(
                name: "source_lu");
        }
    }
}
