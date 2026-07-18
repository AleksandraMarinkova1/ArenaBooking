using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Backend.Hubs;

var builder = WebApplication.CreateBuilder(args);

// 1. Додади контролери и сокети (SignalR)
builder.Services.AddControllers(); 
builder.Services.AddSignalR();

// 🚀 ПОВРЗУВАЊЕ СО БАЗАТА (Паметна селекција: PostgreSQL за Live, SQLite за Локално)
if (builder.Environment.IsProduction())
{
    // Кога е на Render, ја земаме Environment променливата
    var rawConnectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");
    
    string formattedConnectionString = rawConnectionString;

    // Ако линкот почнува со postgresql://, го конвертираме во формат за .NET
    if (!string.IsNullOrEmpty(rawConnectionString) && rawConnectionString.StartsWith("postgresql://"))
    {
        var databaseUrl = new Uri(rawConnectionString);
        var userInfo = databaseUrl.UserInfo.Split(':');
        
        var username = userInfo[0];
        var password = userInfo.Length > 1 ? userInfo[1] : "";
        var host = databaseUrl.Host;
        var port = databaseUrl.Port == -1 ? 5432 : databaseUrl.Port;
        var database = databaseUrl.LocalPath.TrimStart('/');

        formattedConnectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;";
    }

    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(formattedConnectionString));
}
else
{
    // Кога си локално на твојот компјутер, си останува SQLite
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                           ?? "Data Source=bookings.db";
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(connectionString));
}

// 2. Постави ја CORS полисата
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://arena-booking-frontend.vercel.app") // Овде после ќе го ставиме точниот линк од Vercel
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Потребно за SignalR
    });
});

var app = builder.Build();

// 3. Активирај ги middlewares по точен редослед
app.UseCors("AllowAll");
app.UseRouting();
app.UseAuthorization();
app.MapControllers(); 
app.MapHub<BookingHub>("/bookingHub");

// 4. Автоматско менаџирање и полнење на базата при стартување
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();

    // Развојна пракса: Ја бришеме и пак ја креираме базата за да се аплицираат новите колони (Date, Court)
    // Напомена: Ова е супер додека развиваш, кога ќе имаш реални корисници ќе го тргнеме EnsureDeleted()
    context.Database.EnsureDeleted();
    context.Database.EnsureCreated();

    // Ако табелата за термини (TimeSlots) е празна, ја полниме со почетните вредности
    if (!context.TimeSlots.Any())
    {
        var defaultSlots = new List<TimeSlot>
        {
            new TimeSlot { SlotText = "08:00 - 09:00" },
            new TimeSlot { SlotText = "09:00 - 10:00" },
            new TimeSlot { SlotText = "10:00 - 11:00" },
            new TimeSlot { SlotText = "11:00 - 12:00" },
            new TimeSlot { SlotText = "12:00 - 13:00" },
            new TimeSlot { SlotText = "13:00 - 14:00" },
            new TimeSlot { SlotText = "14:00 - 15:00" },
            new TimeSlot { SlotText = "15:00 - 16:00" },
            new TimeSlot { SlotText = "16:00 - 17:00" },
            new TimeSlot { SlotText = "17:00 - 18:00" },
            new TimeSlot { SlotText = "18:00 - 19:00" },
            new TimeSlot { SlotText = "19:00 - 20:00" },
            new TimeSlot { SlotText = "20:00 - 21:00" },
            new TimeSlot { SlotText = "21:00 - 22:00" },
            new TimeSlot { SlotText = "22:00 - 23:00" }
        };

        context.TimeSlots.AddRange(defaultSlots);
        context.SaveChanges();
    }
}

app.Run();