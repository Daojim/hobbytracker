using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddNotePictures : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Two new tables and nothing else: no note has a picture until somebody adds one, so
            // there is nothing to backfill, and notes.body stays NOT NULL because a note that is
            // a picture alone stores an empty body. Two rather than one so that the bytes sit
            // apart from what every journal read brings back; see NotePicture.
            migrationBuilder.CreateTable(
                name: "note_pictures",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    note_id = table.Column<int>(type: "integer", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    content_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    width = table.Column<int>(type: "integer", nullable: false),
                    height = table.Column<int>(type: "integer", nullable: false),
                    byte_count = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_note_pictures", x => x.id);
                    table.CheckConstraint("ck_note_pictures_content_type", "content_type IN ('image/jpeg', 'image/png', 'image/webp')");
                    table.CheckConstraint("ck_note_pictures_size", "width > 0 AND height > 0 AND byte_count > 0");
                    table.ForeignKey(
                        name: "fk_note_pictures_notes_note_id",
                        column: x => x.note_id,
                        principalTable: "notes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "note_picture_bytes",
                columns: table => new
                {
                    picture_id = table.Column<int>(type: "integer", nullable: false),
                    bytes = table.Column<byte[]>(type: "bytea", nullable: false),
                    thumbnail = table.Column<byte[]>(type: "bytea", nullable: false),
                    thumbnail_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_note_picture_bytes", x => x.picture_id);
                    table.CheckConstraint("ck_note_picture_bytes_thumbnail_type", "thumbnail_type IN ('image/jpeg', 'image/png', 'image/webp')");
                    table.ForeignKey(
                        name: "fk_note_picture_bytes_note_pictures_picture_id",
                        column: x => x.picture_id,
                        principalTable: "note_pictures",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_note_pictures_note_id_position",
                table: "note_pictures",
                columns: new[] { "note_id", "position" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "note_picture_bytes");

            migrationBuilder.DropTable(
                name: "note_pictures");
        }
    }
}
