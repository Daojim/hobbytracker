using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddHltbAllStylesHours : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_games_hltb_hours_positive",
                table: "games");

            migrationBuilder.AddColumn<decimal>(
                name: "hltb_all_styles_hours",
                table: "games",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_games_hltb_hours_positive",
                table: "games",
                sql: "(hltb_all_styles_hours    IS NULL OR hltb_all_styles_hours    > 0) AND\r\n(hltb_main_story_hours    IS NULL OR hltb_main_story_hours    > 0) AND\r\n(hltb_main_extra_hours    IS NULL OR hltb_main_extra_hours    > 0) AND\r\n(hltb_completionist_hours IS NULL OR hltb_completionist_hours > 0)");

            // hltb_checked_at means "we have asked HowLongToBeat about this title", and after
            // adding a number we never asked for, that is no longer true of a single row. So
            // this is not a data fix bolted onto a schema change — it is the column being put
            // back to what it says.
            //
            // It has to be here rather than left to the backfill, because the backfill is
            // exactly what it would defeat: BackfillAsync skips anything checked inside
            // Hltb:RecheckAfterDays, which is 30. Without this, POST /api/games/hltb/refresh
            // answers {"queued":0} on a library checked this week and every card keeps showing
            // nothing for a month, with no error and nothing to look at.
            //
            // Safe to re-ask: a miss re-stamps the column and is refused again at no cost but
            // the politeness floor, and a hit rewrites numbers with the same numbers plus the
            // new one. Nothing here is destructive — the three tiers already stored stay put
            // until something better arrives.
            migrationBuilder.Sql("UPDATE games SET hltb_checked_at = NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_games_hltb_hours_positive",
                table: "games");

            migrationBuilder.DropColumn(
                name: "hltb_all_styles_hours",
                table: "games");

            migrationBuilder.AddCheckConstraint(
                name: "ck_games_hltb_hours_positive",
                table: "games",
                sql: "(hltb_main_story_hours    IS NULL OR hltb_main_story_hours    > 0) AND\r\n(hltb_main_extra_hours    IS NULL OR hltb_main_extra_hours    > 0) AND\r\n(hltb_completionist_hours IS NULL OR hltb_completionist_hours > 0)");
        }
    }
}
