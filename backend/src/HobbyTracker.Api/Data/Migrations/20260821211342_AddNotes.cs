using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <summary>
    /// log_entries.notes becomes rows in a notes table, so a pass can carry more than one.
    ///
    /// Hand-edited in one respect: EF scaffolded the DropColumn *first*, which is the data loss
    /// it warned about on the way out. The table has to exist and the text has to be copied into
    /// it before the column can go, so the order here is create, copy, drop.
    /// </summary>
    public partial class AddNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "notes",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    log_entry_id = table.Column<int>(type: "integer", nullable: false),
                    body = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    written_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_notes", x => x.id);
                    table.ForeignKey(
                        name: "fk_notes_log_entries_log_entry_id",
                        column: x => x.log_entry_id,
                        principalTable: "log_entries",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_notes_log_entry_id_written_at",
                table: "notes",
                columns: new[] { "log_entry_id", "written_at" });

            // logged_at is the best date available for text that arrived with its entry: it is
            // when that entry was written down. Empty strings are dropped rather than migrated
            // into notes that say nothing.
            migrationBuilder.Sql("""
                INSERT INTO notes (log_entry_id, body, written_at)
                SELECT id, notes, logged_at
                FROM log_entries
                WHERE notes IS NOT NULL AND notes <> '';
                """);

            migrationBuilder.DropColumn(
                name: "notes",
                table: "log_entries");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "notes",
                table: "log_entries",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            // Lossy, and there is no way for it not to be: a column holds one note and a pass may
            // by then have several. The earliest is the one restored, which makes a round trip
            // stable — Up writes exactly one note per pass, and this reads that one back.
            // Anything written after the migration is dropped by going back.
            migrationBuilder.Sql("""
                UPDATE log_entries entry
                SET notes = earliest.body
                FROM (
                    SELECT DISTINCT ON (log_entry_id) log_entry_id, body
                    FROM notes
                    ORDER BY log_entry_id, written_at, id
                ) earliest
                WHERE earliest.log_entry_id = entry.id;
                """);

            migrationBuilder.DropTable(
                name: "notes");
        }
    }
}
