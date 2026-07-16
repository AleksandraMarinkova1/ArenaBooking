using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace Backend.Hubs
{
    public class BookingHub : Hub
    {
        // Во меморија чуваме кои термини се привремено заклучени
        // Клуч: "Date_Court_TimeSlot", Вредност: ConnectionId на корисникот кој го заклучил
        private static readonly ConcurrentDictionary<string, string> TempLocks = new();

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            // Ако корисникот ја напушти страницата или му падне интернетот, 
            // автоматски ги ослободуваме термините што тој ги имал заклучено во тој момент.
            var userLocks = TempLocks.Where(x => x.Value == Context.ConnectionId).ToList();
            foreach (var l in userLocks)
            {
                if (TempLocks.TryRemove(l.Key, out _))
                {
                    var parts = l.Key.Split('_'); // [Date, Court, TimeSlot]
                    await Clients.All.SendAsync("ReceiveLockReleased", new { date = parts[0], court = parts[1], timeSlot = parts[2] });
                }
            }
            await base.OnDisconnectedAsync(exception);
        }

        // Се повикува кога корисникот ќе го отвори модалот за резервација
        public async Task LockSlot(string date, string court, string timeSlot)
        {
            string key = $"{date}_{court}_{timeSlot}";
            
            // Проверуваме дали веќе е заклучен од некој друг
            if (!TempLocks.ContainsKey(key))
            {
                TempLocks[key] = Context.ConnectionId;

                // Ги известуваме сите дека терминот е привремено зафатен
                await Clients.All.SendAsync("ReceiveLockAcquired", new { date, court, timeSlot });

                // Автоматско отклучување по 5 минути (300,000 милисекунди) доколку не се запише во база
                _ = Task.Run(async () =>
                {
                    await Task.Delay(300000);
                    if (TempLocks.TryGetValue(key, out var connId) && connId == Context.ConnectionId)
                    {
                        TempLocks.TryRemove(key, out _);
                        await Clients.All.SendAsync("ReceiveLockReleased", new { date, court, timeSlot });
                    }
                });
            }
        }

        // Се повикува ако корисникот го затвори модалот без да резервира (клинал „Откажи“)
        public async Task UnlockSlot(string date, string court, string timeSlot)
        {
            string key = $"{date}_{court}_{timeSlot}";
            if (TempLocks.TryGetValue(key, out var connId) && connId == Context.ConnectionId)
            {
                TempLocks.TryRemove(key, out _);
                await Clients.All.SendAsync("ReceiveLockReleased", new { date, court, timeSlot });
            }
        }

        // Чистење на заклучувањето откако резервацијата ќе се запише успешно во база
        public static void ClearLock(string date, string court, string timeSlot)
        {
            string key = $"{date}_{court}_{timeSlot}";
            TempLocks.TryRemove(key, out _);
        }
    }
}