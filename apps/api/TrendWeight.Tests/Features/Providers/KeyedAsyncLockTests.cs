using FluentAssertions;
using TrendWeight.Features.Providers;
using Xunit;

namespace TrendWeight.Tests.Features.Providers;

public class KeyedAsyncLockTests
{
    [Fact]
    public async Task AcquireAndRelease_RemovesTheEntry()
    {
        var sut = new KeyedAsyncLock<string>();

        using (await sut.AcquireAsync("a"))
        {
            sut.Contains("a").Should().BeTrue();
            sut.Count.Should().Be(1);
        }

        sut.Contains("a").Should().BeFalse();
        sut.Count.Should().Be(0);
    }

    [Fact]
    public async Task SameKey_SerializesHoldersAndReleasesEntryAfterTheLastOne()
    {
        var sut = new KeyedAsyncLock<string>();

        var first = await sut.AcquireAsync("a");
        var secondTask = sut.AcquireAsync("a");

        await Task.Delay(50, TestContext.Current.CancellationToken);
        secondTask.IsCompleted.Should().BeFalse("the second caller must wait for the first to release");
        sut.Count.Should().Be(1, "both callers share one entry");

        first.Dispose();
        var second = await secondTask;
        sut.Contains("a").Should().BeTrue("the second caller still holds the key");

        second.Dispose();
        sut.Contains("a").Should().BeFalse();
        sut.Count.Should().Be(0);
    }

    [Fact]
    public async Task DifferentKeys_DoNotBlockEachOther()
    {
        var sut = new KeyedAsyncLock<string>();

        using var a = await sut.AcquireAsync("a");
        var bTask = sut.AcquireAsync("b");

        var completed = await Task.WhenAny(bTask, Task.Delay(1000, TestContext.Current.CancellationToken));
        completed.Should().BeSameAs(bTask, "a different key must not wait behind 'a'");
        sut.Count.Should().Be(2);
        (await bTask).Dispose();
        sut.Count.Should().Be(1);
    }

    [Fact]
    public async Task ManyConcurrentHolders_LeaveNoEntriesBehind()
    {
        var sut = new KeyedAsyncLock<int>();
        var counter = 0;
        var maxConcurrent = 0;

        var tasks = Enumerable.Range(0, 200).Select(async i =>
        {
            using (await sut.AcquireAsync(i % 4))
            {
                var now = Interlocked.Increment(ref counter);
                InterlockedMax(ref maxConcurrent, now);
                await Task.Yield();
                Interlocked.Decrement(ref counter);
            }
        });

        await Task.WhenAll(tasks);

        sut.Count.Should().Be(0);
        maxConcurrent.Should().BeLessThanOrEqualTo(4, "only one holder per key at a time");
    }

    [Fact]
    public async Task DisposingTwice_ReleasesOnlyOnce()
    {
        var sut = new KeyedAsyncLock<string>();
        var releaser = await sut.AcquireAsync("a");

        releaser.Dispose();
        releaser.Dispose();

        sut.Count.Should().Be(0);

        // The key is usable again afterwards
        using (await sut.AcquireAsync("a"))
        {
            sut.Count.Should().Be(1);
        }
        sut.Count.Should().Be(0);
    }

    private static void InterlockedMax(ref int target, int value)
    {
        int current;
        do
        {
            current = target;
            if (current >= value)
            {
                return;
            }
        } while (Interlocked.CompareExchange(ref target, value, current) != current);
    }
}
