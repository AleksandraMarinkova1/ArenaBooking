using Backend.Models;
using Microsoft.EntityFrameworkCore;
using Backend.Hubs;
using Backend.Services;
using Backend.Repositories;
using Resend;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddHostedService<BookingReminderService>();
builder.Services.AddResend(options =>
{
    options.ApiToken = builder.Configuration["ResendApiKey"] ?? Environment.GetEnvironmentVariable("ResendApiKey") ?? "";
});
builder.Services.AddTransient<IEmailService, EmailService>();

// 👉 Регистрирање на новите репозиториуми и сервиси (Mid-level архитектура)
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IBookingService, BookingService>();

if (builder.Environment.IsProduction())
{
    var rawConnectionString = Environment.GetEnvironmentVariable("CONNECTION_STRING");
    string formattedConnectionString = rawConnectionString;

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
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 
                           ?? "Data Source=bookings.db";
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseSqlite(connectionString));
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.SetIsOriginAllowed(_ => true) 
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseRouting();
app.UseAuthorization();
app.MapControllers(); 

app.MapHub<BookingHub>("/bookingHub");

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();

    context.Database.EnsureCreated();

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