using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HobbyTracker.Api.Data.Migrations
{
    /// <summary>
    /// date_started / date_completed become instants, and every entry gains the moment it was
    /// written down.
    ///
    /// Hand-written rather than left as scaffolded. EF sees a type change as a drop and an add,
    /// which would discard every date already recorded; ALTER ... TYPE ... USING converts them
    /// in place instead. Existing dates are read as midnight *here* — the only honest reading of
    /// a bare date written by an app that has always meant local days by it. Reading them as UTC
    /// would shift the whole journal back by an evening.
    /// </summary>
    public partial class PromoteLogEntryDatesToTimestamps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Dropped first: the old constraint names columns that are about to be renamed.
            migrationBuilder.Sql("""
                ALTER TABLE log_entries DROP CONSTRAINT ck_log_entries_date_order;

                ALTER TABLE log_entries
                    ALTER COLUMN date_started TYPE timestamptz
                        USING date_started::timestamp AT TIME ZONE 'America/New_York',
                    ALTER COLUMN date_completed TYPE timestamptz
                        USING date_completed::timestamp AT TIME ZONE 'America/New_York';

                ALTER TABLE log_entries RENAME COLUMN date_started TO started_at;
                ALTER TABLE log_entries RENAME COLUMN date_completed TO completed_at;

                ALTER TABLE log_entries
                    ADD COLUMN logged_at timestamptz NOT NULL DEFAULT now();

                ALTER TABLE log_entries ADD CONSTRAINT ck_log_entries_timestamp_order
                    CHECK (started_at IS NULL
                           OR completed_at IS NULL
                           OR completed_at >= started_at);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Lossy on the way back, unavoidably: a moment cannot survive being narrowed to a
            // day. The day it is narrowed to is the local one, so a round trip is stable.
            migrationBuilder.Sql("""
                ALTER TABLE log_entries DROP CONSTRAINT ck_log_entries_timestamp_order;
                ALTER TABLE log_entries DROP COLUMN logged_at;

                ALTER TABLE log_entries RENAME COLUMN started_at TO date_started;
                ALTER TABLE log_entries RENAME COLUMN completed_at TO date_completed;

                ALTER TABLE log_entries
                    ALTER COLUMN date_started TYPE date
                        USING (date_started AT TIME ZONE 'America/New_York')::date,
                    ALTER COLUMN date_completed TYPE date
                        USING (date_completed AT TIME ZONE 'America/New_York')::date;

                ALTER TABLE log_entries ADD CONSTRAINT ck_log_entries_date_order
                    CHECK (date_started IS NULL
                           OR date_completed IS NULL
                           OR date_completed >= date_started);
                """);
        }
    }
}
