// <copyright file="EntityIdFilter.cs" company="Codenized">
// Copyright (c) Codenized. All rights reserved.
// </copyright>

namespace Codenized.Planixor.Persistence.MySql.Efc.Repositories;

using System.Linq.Expressions;

/// <summary>
/// Builds a translatable "the identifier is one of these" predicate.
/// </summary>
/// <remarks>
/// <para>
/// <c>ids.Contains(e.Id)</c> is the obvious way to write this and it does not work here: MySql.EntityFrameworkCore
/// 10.0.7 cannot map a parameterised collection, and fails with <c>Expression '@ids' in the SQL tree does not have a
/// type mapping assigned</c> — for <see cref="Guid"/> and for <see cref="string"/> alike. Verified against the
/// referenced provider.
/// </para>
/// <para>
/// The way out is to emit each identifier as its own constant and chain them with <c>OR</c>. Entity Framework's
/// optimiser recognises the shape and collapses it back into a real <c>IN (...)</c>, so the database does the
/// filtering:
/// </para>
/// <code>
/// WHERE (`e`.`UserId` = 'alice') AND `e`.`Id` IN ('1111…', '2222…', '3333…')
/// </code>
/// <para>
/// The repositories used to work around the provider limitation by loading the user's whole partition and filtering
/// in memory, which turned every push into a full scan materialised on the heap.
/// </para>
/// <para>
/// Emitting values as constants rather than parameters means each distinct batch produces its own query plan. That
/// is acceptable here for two reasons: batches are capped at 100 identifiers, and the values are
/// <see cref="Guid"/> — already parsed by the model binder, so there is no text from the caller reaching the SQL.
/// Do not copy this shape for a free-text column.
/// </para>
/// </remarks>
internal static class EntityIdFilter
{
    /// <summary>
    /// Builds <c>e =&gt; e.Id == id1 || e.Id == id2 || …</c> for the given identifiers.
    /// </summary>
    /// <typeparam name="TEntity">The entity type, which must expose a <c>Guid Id</c> property.</typeparam>
    /// <param name="ids">The identifiers to match. An empty list yields a predicate that matches nothing.</param>
    /// <returns>The predicate.</returns>
    public static Expression<Func<TEntity, bool>> IdIn<TEntity>(IReadOnlyList<Guid> ids)
        where TEntity : class
    {
        ArgumentNullException.ThrowIfNull(ids);

        ParameterExpression parameter = Expression.Parameter(typeof(TEntity), "e");
        MemberExpression property = Expression.Property(parameter, nameof(IHasGuidId.Id));

        Expression? body = null;

        foreach (Guid id in ids)
        {
            BinaryExpression equals = Expression.Equal(property, Expression.Constant(id));
            body = body is null ? equals : Expression.OrElse(body, equals);
        }

        // No identifiers means nothing can match. Returning a match-all predicate here would hand back the whole
        // table, which is the failure mode this type exists to remove.
        body ??= Expression.Constant(false);

        return Expression.Lambda<Func<TEntity, bool>>(body, parameter);
    }
}
