using System.Collections.Concurrent;

namespace TrendWeight.Features.Providers;

/// <summary>
/// Serializes asynchronous work per key. Unlike a plain dictionary of semaphores, an
/// entry only lives while at least one caller holds or waits for it, so the map does
/// not grow with every key ever seen.
/// </summary>
public sealed class KeyedAsyncLock<TKey> where TKey : notnull
{
    private sealed class Entry : IDisposable
    {
        public readonly SemaphoreSlim Semaphore = new(1, 1);

        // Holders and waiters combined, guarded by lock(this). -1 marks an entry that
        // has been removed from the map; a caller that raced into it must start over.
        public int References;

        public void Dispose() => Semaphore.Dispose();
    }

    private readonly ConcurrentDictionary<TKey, Entry> _entries = new();

    /// <summary>Number of keys currently held or waited for</summary>
    public int Count => _entries.Count;

    /// <summary>Whether any caller currently holds or waits for the key</summary>
    public bool Contains(TKey key) => _entries.ContainsKey(key);

    /// <summary>
    /// Waits for exclusive access to the key. Dispose the result to release it.
    /// </summary>
    public async Task<IDisposable> AcquireAsync(TKey key)
    {
        var entry = Retain(key);
        try
        {
            await entry.Semaphore.WaitAsync();
        }
        catch
        {
            Release(key, entry, held: false);
            throw;
        }

        return new Releaser(this, key, entry);
    }

    private Entry Retain(TKey key)
    {
        while (true)
        {
            var entry = _entries.GetOrAdd(key, _ => new Entry());
            lock (entry)
            {
                if (entry.References >= 0)
                {
                    entry.References++;
                    return entry;
                }
            }
            // The entry was retired between GetOrAdd and the lock; a fresh one will be added
        }
    }

    private void Release(TKey key, Entry entry, bool held)
    {
        if (held)
        {
            entry.Semaphore.Release();
        }

        lock (entry)
        {
            if (--entry.References > 0)
            {
                return;
            }

            _entries.TryRemove(KeyValuePair.Create(key, entry));
            entry.References = -1;
            entry.Dispose();
        }
    }

    private sealed class Releaser : IDisposable
    {
        private readonly KeyedAsyncLock<TKey> _owner;
        private readonly TKey _key;
        private Entry? _entry;

        public Releaser(KeyedAsyncLock<TKey> owner, TKey key, Entry entry)
        {
            _owner = owner;
            _key = key;
            _entry = entry;
        }

        public void Dispose()
        {
            var entry = Interlocked.Exchange(ref _entry, null);
            if (entry != null)
            {
                _owner.Release(_key, entry, held: true);
            }
        }
    }
}
