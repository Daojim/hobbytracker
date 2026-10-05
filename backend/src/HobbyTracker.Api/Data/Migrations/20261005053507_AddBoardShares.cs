using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBoardShares : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // A new table and nothing else: no board is shared until its owner makes a link, so
            // there is nothing to backfill. `parts` is the list of what a share shows, so a part
            // added to the app later is off every existing share until somebody ticks it.
            migrationBuilder.CreateTable(
                name: "board_shares",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    user_id = table.Column<int>(type: "integer", nullable: false),
                    hobby_id = table.Column<int>(type: "integer", nullable: false),
                    token = table.Column<string>(type: "character varying(22)", maxLength: 22, nullable: false),
                    parts = table.Column<string[]>(type: "text[]", nullable: false),
                    shows_name = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_board_shares", x => x.id);
                    table.ForeignKey(
                        name: "fk_board_shares_hobbies_hobby_id",
                        column: x => x.hobby_id,
                        principalTable: "hobby_lu",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_board_shares_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_board_shares_hobby_id",
                table: "board_shares",
                column: "hobby_id");

            migrationBuilder.CreateIndex(
                name: "ix_board_shares_token",
                table: "board_shares",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_board_shares_user_id_hobby_id",
                table: "board_shares",
                columns: new[] { "user_id", "hobby_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "board_shares");
        }
    }
}
