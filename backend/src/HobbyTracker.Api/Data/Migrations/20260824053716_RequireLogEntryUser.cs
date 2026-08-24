using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class RequireLogEntryUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_log_entries_users_user_id",
                table: "log_entries");

            // defaultValue: 0 was scaffolded onto the AlterColumn below and has been removed
            // deliberately. It would have done two unwanted things: emitted an UPDATE turning
            // every unowned pass into user 0, and left a DEFAULT 0 on the column so an insert
            // omitting the owner silently claims to be somebody. There is no user 0, so the
            // first would fail on the foreign key re-added below anyway — but confusingly, and
            // only after writing.
            //
            // Without it this is a bare SET NOT NULL, which fails immediately and says so if any
            // row still has no owner. Clear them first; see CLAUDE.md under Auth.
            migrationBuilder.AlterColumn<int>(
                name: "user_id",
                table: "log_entries",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "fk_log_entries_users_user_id",
                table: "log_entries",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_log_entries_users_user_id",
                table: "log_entries");

            migrationBuilder.AlterColumn<int>(
                name: "user_id",
                table: "log_entries",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "fk_log_entries_users_user_id",
                table: "log_entries",
                column: "user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
