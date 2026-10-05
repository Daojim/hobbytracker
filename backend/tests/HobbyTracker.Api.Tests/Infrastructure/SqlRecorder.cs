using System.Collections.Concurrent;
using System.Data.Common;
using System.Text.RegularExpressions;
using HobbyTracker.Api.Data;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Every command a host sends to the database, for asserting on what a route <em>read</em> rather
/// than only on what it answered.
///
/// <para>
/// It exists for a promise a response body cannot keep on its own: that no route a share reaches
/// selects from <c>notes</c>. A note left out of the answer by a <c>CASE</c> around the subquery
/// that reads it, or nulled after the read, gives the same JSON as one never read at all. The
/// SQL is where the difference shows.
/// </para>
/// </summary>
public sealed partial class SqlRecorder : DbCommandInterceptor
{
    private readonly ConcurrentQueue<string> _commands = new();

    /// <summary>The commands so far, oldest first.</summary>
    public IReadOnlyList<string> Commands => [.. _commands];

    public void Clear() => _commands.Clear();

    /// <summary>
    /// Whether a command reads the notes table. The word on its own, because with snake-case names
    /// the table is the one identifier spelled that way: its columns are <c>body</c> and
    /// <c>written_at</c>, and nothing else in the schema is called anything with "notes" in it.
    /// </summary>
    public static bool ReadsNotes(string sql) => NotesTable().IsMatch(sql);

    /// <summary>
    /// A host that records every command into <paramref name="recorder"/>, beside the interceptors
    /// production already has — <c>ConfigureDbContext</c> adds to the options rather than
    /// replacing them, so the history recorder is still there.
    /// </summary>
    public static WebApplicationFactory<Program> Into(
        WebApplicationFactory<Program> factory, SqlRecorder recorder) =>
        factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(services =>
            services.ConfigureDbContext<HobbyTrackerDbContext>(options =>
                options.AddInterceptors(recorder))));

    public override InterceptionResult<DbDataReader> ReaderExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<DbDataReader> result)
    {
        _commands.Enqueue(command.CommandText);
        return result;
    }

    public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<DbDataReader> result,
        CancellationToken cancellationToken = default)
    {
        _commands.Enqueue(command.CommandText);
        return ValueTask.FromResult(result);
    }

    public override InterceptionResult<object> ScalarExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<object> result)
    {
        _commands.Enqueue(command.CommandText);
        return result;
    }

    public override ValueTask<InterceptionResult<object>> ScalarExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<object> result,
        CancellationToken cancellationToken = default)
    {
        _commands.Enqueue(command.CommandText);
        return ValueTask.FromResult(result);
    }

    public override InterceptionResult<int> NonQueryExecuting(
        DbCommand command, CommandEventData eventData, InterceptionResult<int> result)
    {
        _commands.Enqueue(command.CommandText);
        return result;
    }

    public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
        DbCommand command,
        CommandEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        _commands.Enqueue(command.CommandText);
        return ValueTask.FromResult(result);
    }

    [GeneratedRegex(@"\bnotes\b", RegexOptions.IgnoreCase)]
    private static partial Regex NotesTable();
}
